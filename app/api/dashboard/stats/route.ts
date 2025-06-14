import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 今日の日付範囲を取得
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 過去7日間の日付範囲
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 並列でデータを取得
    const [
      todayPostsCount,
      totalPostsCount,
      activeSessionsCount,
      totalSessions,
      recentPosts,
      performanceData,
      weeklyStats
    ] = await Promise.all([
      // 今日の投稿数
      prisma.viralPost.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      // 総投稿数
      prisma.viralPost.count(),

      // アクティブセッション数（処理中）
      prisma.cotSession.count({
        where: {
          status: {
            in: ['PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING']
          }
        }
      }),

      // 総セッション数
      prisma.cotSession.count(),

      // 最近の投稿（パフォーマンスデータ付き）
      prisma.viralPost.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          performance: true
        }
      }),

      // パフォーマンスデータ（過去7日間）
      prisma.viralPostPerformance.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        },
        include: {
          post: true
        }
      }),

      // 週間統計
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as posts_count,
          AVG(CASE WHEN performance.engagement_rate IS NOT NULL THEN performance.engagement_rate ELSE 0 END) as avg_engagement
        FROM viral_posts
        LEFT JOIN (
          SELECT DISTINCT ON (post_id) *
          FROM viral_post_performance
          ORDER BY post_id, measured_at DESC
        ) performance ON viral_posts.id = performance.post_id
        WHERE created_at >= ${sevenDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `
    ])

    // エンゲージメント率の計算
    const totalEngagements = performanceData.reduce((sum, perf) => {
      // Use the most recent data available (24h > 1h > 30m)
      const likes = perf.likes24h || perf.likes1h || perf.likes30m || 0
      const retweets = perf.retweets24h || perf.retweets1h || perf.retweets30m || 0
      const comments = perf.comments24h || perf.comments1h || perf.comments30m || 0
      return sum + likes + retweets + comments
    }, 0)
    const totalImpressions = performanceData.reduce((sum, perf) => {
      const impressions = perf.impressions24h || perf.impressions1h || perf.impressions30m || 0
      return sum + impressions
    }, 0)
    const avgEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0

    // 前週比の計算
    const lastWeekStart = new Date(sevenDaysAgo)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    
    const lastWeekPostsCount = await prisma.viralPost.count({
      where: {
        createdAt: {
          gte: lastWeekStart,
          lt: sevenDaysAgo
        }
      }
    })

    const thisWeekPostsCount = await prisma.viralPost.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    })

    const growthRate = lastWeekPostsCount > 0 
      ? ((thisWeekPostsCount - lastWeekPostsCount) / lastWeekPostsCount) * 100 
      : 0

    // レスポンスデータの構築
    const stats = {
      todayPosts: todayPostsCount,
      totalPosts: totalPostsCount,
      activeSessions: activeSessionsCount,
      totalSessions,
      avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
      totalImpressions,
      growthRate: Number(growthRate.toFixed(1)),
      recentActivity: recentPosts.map(post => ({
        id: post.id,
        content: post.content?.substring(0, 100) + '...',
        createdAt: post.createdAt,
        platform: post.platform,
        status: post.postedAt ? 'posted' : (post.scheduledAt ? 'scheduled' : 'draft'),
        performance: post.performance ? {
          likes: post.performance.likes24h || post.performance.likes1h || post.performance.likes30m || 0,
          retweets: post.performance.retweets24h || post.performance.retweets1h || post.performance.retweets30m || 0,
          comments: post.performance.comments24h || post.performance.comments1h || post.performance.comments30m || 0,
          impressions: post.performance.impressions24h || post.performance.impressions1h || post.performance.impressions30m || 0,
          engagementRate: post.performance.engagementRate || 0
        } : null
      })),
      weeklyTrend: weeklyStats,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Dashboard stats error:', error)
    
    // エラー時でもデフォルト値を返す
    return NextResponse.json({
      todayPosts: 0,
      totalPosts: 0,
      activeSessions: 0,
      totalSessions: 0,
      avgEngagementRate: 0,
      totalImpressions: 0,
      growthRate: 0,
      recentActivity: [],
      weeklyTrend: [],
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch complete stats'
    })
  }
}