import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { usernames } = await request.json()
    
    if (!usernames || !Array.isArray(usernames) || usernames.length < 2) {
      return NextResponse.json(
        { error: 'Please provide at least 2 usernames to compare' },
        { status: 400 }
      )
    }

    if (usernames.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 users can be compared at once' },
        { status: 400 }
      )
    }

    // 各ユーザーのデータを取得
    const comparisons = await Promise.all(
      usernames.map(async (username) => {
        // 基本情報
        const userInfo = await prisma.buzzPost.findFirst({
          where: { authorUsername: username },
          orderBy: { postedAt: 'desc' },
          select: {
            authorUsername: true,
            authorId: true,
            authorFollowers: true,
            authorVerified: true
          }
        })

        if (!userInfo) {
          return { username, error: 'User not found' }
        }

        // 統計情報
        const stats = await prisma.buzzPost.aggregate({
          where: { authorUsername: username },
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
          }
        })

        // 過去7日間の活動
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const recentActivity = await prisma.buzzPost.aggregate({
          where: {
            authorUsername: username,
            postedAt: { gte: sevenDaysAgo }
          },
          _count: { id: true },
          _sum: {
            likesCount: true,
            retweetsCount: true,
            impressionsCount: true
          }
        })

        // パフォーマンス指標の計算
        const totalEngagement = (stats._sum.likesCount || 0) + (stats._sum.retweetsCount || 0)
        const totalImpressions = stats._sum.impressionsCount || 0
        const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0

        // フォロワーあたりのエンゲージメント
        const engagementPerFollower = userInfo.authorFollowers > 0
          ? totalEngagement / userInfo.authorFollowers
          : 0

        return {
          username: userInfo.authorUsername,
          userId: userInfo.authorId,
          followers: userInfo.authorFollowers || 0,
          verified: userInfo.authorVerified || false,
          totalPosts: stats._count.id,
          avgLikes: stats._avg.likesCount || 0,
          avgRetweets: stats._avg.retweetsCount || 0,
          avgImpressions: stats._avg.impressionsCount || 0,
          engagementRate,
          engagementPerFollower,
          recentPosts: recentActivity._count.id,
          recentEngagement: (recentActivity._sum.likesCount || 0) + (recentActivity._sum.retweetsCount || 0)
        }
      })
    )

    // 成功したユーザーのみフィルタリング
    const validComparisons = comparisons.filter(c => !c.error)

    // 各指標のランキングを計算
    const rankings = {
      byFollowers: [...validComparisons].sort((a, b) => b.followers - a.followers),
      byEngagementRate: [...validComparisons].sort((a, b) => b.engagementRate - a.engagementRate),
      byEngagementPerFollower: [...validComparisons].sort((a, b) => b.engagementPerFollower - a.engagementPerFollower),
      byRecentActivity: [...validComparisons].sort((a, b) => b.recentPosts - a.recentPosts)
    }

    return NextResponse.json({
      comparisons: validComparisons,
      rankings,
      summary: {
        totalUsers: validComparisons.length,
        avgFollowers: validComparisons.reduce((sum, u) => sum + u.followers, 0) / validComparisons.length,
        avgEngagementRate: validComparisons.reduce((sum, u) => sum + u.engagementRate, 0) / validComparisons.length
      }
    })

  } catch (error) {
    console.error('Error comparing influencers:', error)
    return NextResponse.json(
      { error: 'Failed to compare influencers' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}