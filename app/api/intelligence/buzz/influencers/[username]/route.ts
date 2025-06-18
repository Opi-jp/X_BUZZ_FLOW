import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  
  try {
    // ユーザーの基本情報を取得
    const userInfo = await prisma.buzzPost.findFirst({
      where: {
        authorUsername: username
      },
      orderBy: {
        postedAt: 'desc'
      },
      select: {
        authorUsername: true,
        authorId: true,
        authorFollowers: true,
        authorFollowing: true,
        authorVerified: true
      }
    })

    if (!userInfo) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 全期間の統計を取得
    const allTimeStats = await prisma.buzzPost.aggregate({
      where: {
        authorUsername: username
      },
      _count: {
        id: true
      },
      _sum: {
        likesCount: true,
        retweetsCount: true,
        repliesCount: true,
        impressionsCount: true
      },
      _avg: {
        likesCount: true,
        retweetsCount: true,
        repliesCount: true,
        impressionsCount: true
      }
    })

    // 時系列データ（過去30日間）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(posted_at) as date,
        COUNT(*) as post_count,
        SUM(likes_count) as total_likes,
        SUM(retweets_count) as total_retweets,
        SUM(impressions_count) as total_impressions,
        AVG(likes_count) as avg_likes,
        AVG(retweets_count) as avg_retweets,
        AVG(impressions_count) as avg_impressions
      FROM buzz_posts
      WHERE author_username = ${username}
        AND posted_at >= ${thirtyDaysAgo}
      GROUP BY DATE(posted_at)
      ORDER BY date DESC
    `

    // カテゴリ別分析
    const categoryKeywords = {
      AI: ['AI', '人工知能', 'ChatGPT', 'LLM', 'GPT', 'Claude', 'Gemini'],
      Work: ['働き方', 'リモートワーク', 'キャリア', '転職', '副業', 'フリーランス'],
      Creative: ['クリエイティブ', 'デザイン', 'アート', '創造', 'イノベーション'],
      Tech: ['技術', 'プログラミング', '開発', 'エンジニア', 'IT'],
      Business: ['ビジネス', '起業', 'スタートアップ', 'マーケティング', '経営']
    }

    const categoryStats = await Promise.all(
      Object.entries(categoryKeywords).map(async ([category, keywords]) => {
        const posts = await prisma.buzzPost.findMany({
          where: {
            authorUsername: username,
            OR: keywords.map(keyword => ({
              content: { contains: keyword, mode: 'insensitive' as const }
            }))
          },
          select: {
            likesCount: true,
            retweetsCount: true,
            impressionsCount: true
          }
        })

        const totalPosts = posts.length
        const totalEngagement = posts.reduce((sum, p) => sum + p.likesCount + p.retweetsCount, 0)
        const avgEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0

        return {
          category,
          postCount: totalPosts,
          totalEngagement,
          avgEngagement
        }
      })
    )

    // トップパフォーマンス投稿
    const topPosts = await prisma.buzzPost.findMany({
      where: {
        authorUsername: username
      },
      orderBy: [
        { impressionsCount: 'desc' }
      ],
      take: 10,
      select: {
        id: true,
        content: true,
        likesCount: true,
        retweetsCount: true,
        repliesCount: true,
        impressionsCount: true,
        postedAt: true,
        url: true,
        hashtags: true
      }
    })

    // 投稿時間分析
    const postingTimeAnalysis = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM posted_at) as hour,
        COUNT(*) as post_count,
        AVG(likes_count + retweets_count) as avg_engagement
      FROM buzz_posts
      WHERE author_username = ${username}
      GROUP BY EXTRACT(HOUR FROM posted_at)
      ORDER BY avg_engagement DESC
    `

    // エンゲージメント率の計算
    const totalEngagement = (allTimeStats._sum.likesCount || 0) + 
                          (allTimeStats._sum.retweetsCount || 0) + 
                          (allTimeStats._sum.repliesCount || 0)
    const totalImpressions = allTimeStats._sum.impressionsCount || 0
    const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0

    const response = {
      user: {
        username: userInfo.authorUsername,
        userId: userInfo.authorId,
        followers: userInfo.authorFollowers || 0,
        following: userInfo.authorFollowing || 0,
        verified: userInfo.authorVerified || false
      },
      stats: {
        totalPosts: allTimeStats._count.id,
        totalLikes: allTimeStats._sum.likesCount || 0,
        totalRetweets: allTimeStats._sum.retweetsCount || 0,
        totalReplies: allTimeStats._sum.repliesCount || 0,
        totalImpressions: allTimeStats._sum.impressionsCount || 0,
        avgLikesPerPost: allTimeStats._avg.likesCount || 0,
        avgRetweetsPerPost: allTimeStats._avg.retweetsCount || 0,
        avgRepliesPerPost: allTimeStats._avg.repliesCount || 0,
        avgImpressionsPerPost: allTimeStats._avg.impressionsCount || 0,
        engagementRate
      },
      dailyStats,
      categoryStats: categoryStats.filter(c => c.postCount > 0),
      topPosts,
      postingTimeAnalysis
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching influencer details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch influencer details' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}