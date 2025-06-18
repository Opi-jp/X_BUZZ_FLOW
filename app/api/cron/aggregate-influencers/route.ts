import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export const maxDuration = 60 // Vercelプランに対応

export async function POST(request: NextRequest) {
  try {
    // CRONシークレットの検証
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting influencer aggregation...')

    // 過去30日間のデータを対象に集計
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // インフルエンサーデータの集計
    const influencersData = await prisma.buzzPost.groupBy({
      by: ['authorUsername', 'authorId'],
      where: {
        postedAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true },
      _sum: {
        likesCount: true,
        retweetsCount: true,
        repliesCount: true,
        impressionsCount: true
      },
      _avg: {
        likesCount: true,
        retweetsCount: true,
        impressionsCount: true
      },
      _max: {
        authorFollowers: true,
        authorVerified: true,
        postedAt: true
      }
    })

    console.log(`[CRON] Processing ${influencersData.length} influencers...`)

    // 各インフルエンサーの詳細分析
    const processedInfluencers = []
    
    for (const data of influencersData) {
      // エンゲージメント率の計算
      const totalEngagement = (data._sum.likesCount || 0) + 
                            (data._sum.retweetsCount || 0) + 
                            (data._sum.repliesCount || 0)
      const totalImpressions = data._sum.impressionsCount || 0
      const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0

      // カテゴリ分析
      const categoryScores = await analyzeCategoryExpertise(data.authorUsername)

      // 投稿頻度分析（過去7日間）
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentPostCount = await prisma.buzzPost.count({
        where: {
          authorUsername: data.authorUsername,
          postedAt: { gte: sevenDaysAgo }
        }
      })

      // バイラルスコアの計算（フォロワー数、エンゲージメント率、投稿頻度を考慮）
      const followerScore = Math.min((data._max.authorFollowers || 0) / 100000, 1) * 30 // 最大30ポイント
      const engagementScore = Math.min(engagementRate / 10, 1) * 40 // 最大40ポイント
      const activityScore = Math.min(recentPostCount / 50, 1) * 30 // 最大30ポイント
      const viralScore = followerScore + engagementScore + activityScore

      processedInfluencers.push({
        username: data.authorUsername,
        userId: data.authorId,
        followers: data._max.authorFollowers || 0,
        verified: data._max.authorVerified || false,
        postCount30d: data._count.id,
        postCount7d: recentPostCount,
        totalEngagement,
        totalImpressions,
        engagementRate,
        avgLikes: data._avg.likesCount || 0,
        avgRetweets: data._avg.retweetsCount || 0,
        avgImpressions: data._avg.impressionsCount || 0,
        viralScore,
        categoryScores,
        lastActiveAt: data._max.postedAt
      })
    }

    // インフルエンサーデータをデータベースに保存
    console.log('[CRON] Saving influencer data to database...')
    let savedCount = 0
    
    for (const influencer of processedInfluencers) {
      try {
        // メトリクスデータの構造化
        const metrics7d = {
          postCount: influencer.postCount7d,
          totalEngagement: 0, // 7日間のデータは別途取得が必要
          avgEngagementRate: 0
        }
        
        const metrics30d = {
          postCount: influencer.postCount30d,
          totalEngagement: influencer.totalEngagement,
          totalImpressions: influencer.totalImpressions,
          avgLikes: influencer.avgLikes,
          avgRetweets: influencer.avgRetweets,
          avgImpressions: influencer.avgImpressions,
          engagementRate: influencer.engagementRate
        }
        
        // 主要カテゴリの判定
        const primaryCategory = Object.entries(influencer.categoryScores)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || null
        
        // Upsert操作でインフルエンサーデータを保存
        await prisma.buzzInfluencer.upsert({
          where: { username: influencer.username },
          update: {
            userId: influencer.userId,
            followers: influencer.followers,
            verified: influencer.verified,
            metrics7d,
            metrics30d,
            categoryScores: influencer.categoryScores,
            primaryCategory,
            engagementRate: influencer.engagementRate,
            viralScore: influencer.viralScore,
            lastActiveAt: influencer.lastActiveAt,
            lastAnalyzedAt: new Date()
          },
          create: {
            username: influencer.username,
            userId: influencer.userId,
            followers: influencer.followers,
            verified: influencer.verified,
            metrics7d,
            metrics30d,
            categoryScores: influencer.categoryScores,
            primaryCategory,
            engagementRate: influencer.engagementRate,
            viralScore: influencer.viralScore,
            lastActiveAt: influencer.lastActiveAt,
            lastAnalyzedAt: new Date()
          }
        })
        savedCount++
      } catch (error) {
        console.error(`[CRON] Error saving influencer @${influencer.username}:`, error)
      }
    }
    
    console.log(`[CRON] Saved ${savedCount} influencers to database`)
    
    // トップインフルエンサーの表示
    console.log('[CRON] Top 10 influencers by viral score:')
    const topInfluencers = processedInfluencers
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, 10)
    
    topInfluencers.forEach((influencer, index) => {
      console.log(`${index + 1}. @${influencer.username} - Score: ${influencer.viralScore.toFixed(2)}, Followers: ${influencer.followers}, Engagement: ${influencer.engagementRate.toFixed(2)}%`)
    })

    return NextResponse.json({
      success: true,
      processedCount: processedInfluencers.length,
      topInfluencers: topInfluencers.map(i => ({
        username: i.username,
        viralScore: i.viralScore,
        followers: i.followers,
        engagementRate: i.engagementRate
      }))
    })

  } catch (error) {
    console.error('[CRON] Error aggregating influencers:', error)
    return NextResponse.json(
      { error: 'Failed to aggregate influencer data' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// カテゴリ専門性の分析
async function analyzeCategoryExpertise(username: string) {
  const categories = {
    ai: ['AI', '人工知能', 'ChatGPT', 'LLM', 'GPT', 'Claude', 'Gemini', '機械学習'],
    work: ['働き方', 'リモートワーク', 'キャリア', '転職', '副業', 'フリーランス', '就職'],
    creative: ['クリエイティブ', 'デザイン', 'アート', '創造', 'イノベーション', '制作'],
    tech: ['技術', 'プログラミング', '開発', 'エンジニア', 'IT', 'Web3', 'ブロックチェーン'],
    business: ['ビジネス', '起業', 'スタートアップ', 'マーケティング', '経営', '投資']
  }

  const scores: Record<string, number> = {}

  for (const [category, keywords] of Object.entries(categories)) {
    const posts = await prisma.buzzPost.count({
      where: {
        authorUsername: username,
        OR: keywords.map(keyword => ({
          content: { contains: keyword, mode: 'insensitive' as const }
        }))
      }
    })

    // 全投稿数を取得
    const totalPosts = await prisma.buzzPost.count({
      where: { authorUsername: username }
    })

    // カテゴリスコア（0-100）
    scores[category] = totalPosts > 0 ? Math.min((posts / totalPosts) * 100, 100) : 0
  }

  return scores
}