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
      // 今日の投稿数（一時的にCotDraftを使用）
      prisma.cot_drafts.count({
        where: {
          created_at: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      // 総投稿数
      prisma.cot_drafts.count(),

      // アクティブセッション数（処理中）
      prisma.cot_sessions.count({
        where: {
          status: {
            in: ['PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING']
          }
        }
      }),

      // 総セッション数
      prisma.cot_sessions.count(),

      // 最近の投稿（パフォーマンスデータ付き）
      prisma.cot_drafts.findMany({
        take: 5,
        orderBy: { created_at: 'desc' }
      }),

      // パフォーマンスデータ（過去7日間）
      prisma.cot_draft_performance.findMany({
        where: {
          collected_at: {
            gte: sevenDaysAgo
          }
        }
      }),

      // 週間統計（新しいスキーマ対応）
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as posts_count,
          AVG(CASE WHEN performance.engagement_rate IS NOT NULL THEN performance.engagement_rate ELSE 0 END) as avg_engagement
        FROM cot_drafts
        LEFT JOIN cot_draft_performance performance ON cot_drafts.id = performance.draft_id
        WHERE created_at >= ${sevenDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `
    ])

    // エンゲージメント率の計算
    const totalEngagements = performanceData.reduce((sum, perf) => {
      // Use the most recent data available (24h > 1h > 30m)
      const likes = perf.likes_24h || perf.likes_1h || perf.likes_30m || 0
      const retweets = perf.retweets_24h || perf.retweets_1h || perf.retweets_30m || 0
      const comments = perf.replies_24h || perf.replies_1h || perf.replies_30m || 0
      return sum + likes + retweets + comments
    }, 0)
    const totalImpressions = performanceData.reduce((sum, perf) => {
      const impressions = perf.impressions_24h || perf.impressions_1h || perf.impressions_30m || 0
      return sum + impressions
    }, 0)
    const avgEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0

    // 前週比の計算
    const lastWeekStart = new Date(sevenDaysAgo)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    
    const lastWeekPostsCount = await prisma.cot_drafts.count({
      where: {
        created_at: {
          gte: lastWeekStart,
          lt: sevenDaysAgo
        }
      }
    })

    const thisWeekPostsCount = await prisma.cot_drafts.count({
      where: {
        created_at: {
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
        created_at: post.created_at,
        platform: 'Twitter',
        status: post.posted_at ? 'posted' : (post.scheduled_at ? 'scheduled' : 'draft'),
        performance: null
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