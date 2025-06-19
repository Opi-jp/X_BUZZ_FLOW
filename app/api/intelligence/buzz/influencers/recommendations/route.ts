import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const interests = searchParams.get('interests')?.split(',') || ['ai', 'work'] // ユーザーの興味分野
  const limit = parseInt(searchParams.get('limit') || '10')
  
  try {
    // 興味分野に基づくキーワードマッピング
    const interestKeywords: Record<string, string[]> = {
      ai: ['AI', '人工知能', 'ChatGPT', 'LLM', 'GPT', 'Claude', 'Gemini'],
      work: ['働き方', 'リモートワーク', 'キャリア', '転職', '副業'],
      creative: ['クリエイティブ', 'デザイン', 'アート', '創造'],
      tech: ['技術', 'プログラミング', '開発', 'エンジニア'],
      business: ['ビジネス', '起業', 'スタートアップ', 'マーケティング']
    }

    // 興味分野に関連するキーワードを収集
    const keywords: string[] = []
    interests.forEach(interest => {
      if (interestKeywords[interest]) {
        keywords.push(...interestKeywords[interest])
      }
    })

    // 過去30日間のデータからインフルエンサーを抽出
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    // 各キーワードでインフルエンサーを検索し、スコアリング
    const influencerScores = new Map<string, {
      username: string,
      userId: string,
      followers: number,
      verified: boolean,
      score: number,
      matchedKeywords: Set<string>,
      engagementRate: number,
      postCount: number
    }>()

    // キーワードごとにインフルエンサーを検索
    for (const keyword of keywords) {
      const posts = await prisma.buzzPost.groupBy({
        by: ['authorUsername', 'authorId'],
        where: {
          content: { contains: keyword, mode: 'insensitive' as const },
          postedAt: { gte: thirtyDaysAgo },
          // フォロワー数が一定以上のユーザーのみ
          authorFollowers: { gte: 1000 }
        },
        _count: { id: true },
        _sum: {
          likesCount: true,
          retweetsCount: true,
          impressionsCount: true
        },
        _max: {
          authorFollowers: true,
          authorVerified: true
        }
      })

      posts.forEach(post => {
        const username = post.authorUsername
        const totalEngagement = (post._sum.likesCount || 0) + (post._sum.retweetsCount || 0)
        const totalImpressions = post._sum.impressionsCount || 0
        const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0

        if (!influencerScores.has(username)) {
          influencerScores.set(username, {
            username,
            userId: post.authorId,
            followers: post._max.authorFollowers || 0,
            verified: post._max.authorVerified || false,
            score: 0,
            matchedKeywords: new Set(),
            engagementRate: 0,
            postCount: 0
          })
        }

        const influencer = influencerScores.get(username)!
        influencer.matchedKeywords.add(keyword)
        influencer.postCount += post._count.id
        influencer.engagementRate = Math.max(influencer.engagementRate, engagementRate)
        
        // スコアの計算（キーワードマッチ数、エンゲージメント率、投稿数を考慮）
        influencer.score = 
          influencer.matchedKeywords.size * 20 + // キーワードマッチ数
          Math.min(influencer.engagementRate * 10, 50) + // エンゲージメント率
          Math.min(influencer.postCount, 30) // 投稿数
      })
    }

    // スコアでソートして上位を取得
    const recommendations = Array.from(influencerScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // 各インフルエンサーの最新投稿を取得
    const recommendationsWithPosts = await Promise.all(
      recommendations.map(async (rec) => {
        const recentPosts = await prisma.buzzPost.findMany({
          where: {
            authorUsername: rec.username,
            postedAt: { gte: thirtyDaysAgo },
            OR: keywords.map(keyword => ({
              content: { contains: keyword, mode: 'insensitive' as const }
            }))
          },
          orderBy: { impressionsCount: 'desc' },
          take: 3,
          select: {
            id: true,
            content: true,
            likesCount: true,
            retweetsCount: true,
            impressionsCount: true,
            postedAt: true,
            url: true
          }
        })

        return {
          username: rec.username,
          userId: rec.userId,
          followers: rec.followers,
          verified: rec.verified,
          score: rec.score,
          matchedInterests: Array.from(rec.matchedKeywords),
          engagementRate: rec.engagementRate,
          postCount: rec.postCount,
          recommendationReason: generateRecommendationReason(rec, interests),
          recentPosts
        }
      })
    )

    return NextResponse.json({
      recommendations: recommendationsWithPosts,
      interests,
      total: recommendationsWithPosts.length
    })

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// 推薦理由を生成
function generateRecommendationReason(
  influencer: { matchedKeywords: Set<string>, engagementRate: number, followers: number, verified: boolean },
  interests: string[]
): string {
  const reasons = []
  
  if (influencer.matchedKeywords.size >= 3) {
    reasons.push(`${influencer.matchedKeywords.size}つの関連トピックをカバー`)
  }
  
  if (influencer.engagementRate > 5) {
    reasons.push(`高エンゲージメント率 (${influencer.engagementRate.toFixed(1)}%)`)
  }
  
  if (influencer.followers > 10000) {
    reasons.push(`${Math.floor(influencer.followers / 1000)}Kフォロワー`)
  }
  
  if (influencer.verified) {
    reasons.push('認証済みアカウント')
  }
  
  return reasons.join(' • ')
}