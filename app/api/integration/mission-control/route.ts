import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling } from '@/lib/api/error-handler'
import { subDays, startOfDay } from 'date-fns'

// ダッシュボードデータ取得API
export const GET = withErrorHandling(async (request: Request) => {
  try {
    const now = new Date()
    const today = startOfDay(now)
    const yesterday = subDays(today, 1)
    
    // 並列でデータ取得
    const [
      activeSessions,
      recentDrafts,
      scheduledPosts,
      todayTop10,
      scheduledRTs,
      stats
    ] = await Promise.all([
      // アクティブセッション
      prisma.viralSession.findMany({
        where: {
          status: { not: 'COMPLETED' }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: {
            select: { drafts: true }
          }
        }
      }),
      
      // 最近の下書き
      prisma.viralDraftV2.findMany({
        where: {
          status: { in: ['DRAFT', 'SCHEDULED'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          content: true,
          status: true,
          createdAt: true,
          scheduledAt: true
        }
      }),
      
      // 予約投稿
      prisma.viralDraftV2.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: now }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 20
      }),
      
      // 今日の10大ニュース（最新のNewsThread）
      prisma.newsThread.findFirst({
        where: {
          createdAt: { gte: yesterday },
          title: { contains: '10大ニュース' }
        },
        include: {
          items: {
            include: {
              article: true
            },
            orderBy: { order: 'asc' }
          }
        }
      }),
      
      // 予約RT
      prisma.scheduledRetweet.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gte: now }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 20
      }),
      
      // 統計情報
      Promise.all([
        prisma.viralSession.count({
          where: { createdAt: { gte: yesterday } }
        }),
        prisma.viralDraftV2.count({
          where: { status: 'DRAFT' }
        }),
        prisma.viralDraftV2.count({
          where: { 
            status: 'SCHEDULED',
            scheduledAt: { gte: now }
          }
        }),
        prisma.scheduledRetweet.count({
          where: {
            status: 'SCHEDULED',
            scheduledAt: { gte: now }
          }
        })
      ])
    ])
    
    // トレンディングトピック（最近のセッションから抽出）
    const recentSessions = await prisma.viralSession.findMany({
      where: {
        createdAt: { gte: subDays(now, 7) }
      },
      select: {
        theme: true,
        topics: true
      },
      take: 50
    })
    
    const topicCounts = new Map<string, number>()
    recentSessions.forEach(session => {
      // テーマをカウント
      const theme = session.theme.toLowerCase()
      topicCounts.set(theme, (topicCounts.get(theme) || 0) + 1)
      
      // トピックをカウント（JSONから抽出）
      if (session.topics && typeof session.topics === 'object') {
        const topics = (session.topics as any).parsed || []
        topics.forEach((topic: any) => {
          if (topic.TOPIC) {
            const t = topic.TOPIC.toLowerCase()
            topicCounts.set(t, (topicCounts.get(t) || 0) + 1)
          }
        })
      }
    })
    
    // トレンディングトピックをソート
    const trendingTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count], index) => ({
        id: `trend-${index}`,
        name,
        count
      }))
    
    // 今後のアクション（投稿とRTを統合）
    const upcomingActions = [
      ...scheduledPosts.map(post => ({
        id: post.id,
        type: 'post' as const,
        title: post.title,
        scheduledAt: post.scheduledAt,
        status: post.status
      })),
      ...scheduledRTs.map(rt => ({
        id: rt.id,
        type: 'rt' as const,
        title: `RT: ${rt.originalContent.substring(0, 50)}...`,
        scheduledAt: rt.scheduledAt,
        status: rt.status
      }))
    ]
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
      .slice(0, 10)
    
    // 10大ニュースの整形
    const todayTop10Items = todayTop10?.items.map((item, index) => ({
      id: item.id,
      rank: index + 1,
      title: item.article.title,
      url: item.article.url,
      reason: (todayTop10.metadata as any)?.ranking?.[index]?.reason || ''
    })) || []
    
    return {
      viral: {
        activeSessions,
        recentDrafts,
        scheduledPosts
      },
      news: {
        todayTop10: todayTop10Items,
        trendingTopics,
        scheduledThreads: [] // TODO: NewsThread実装
      },
      performance: {
        recentPosts: [], // TODO: 投稿済みコンテンツの実装
        scheduledRTs,
        upcomingActions
      },
      stats: {
        totalSessions: stats[0],
        totalDrafts: stats[1],
        scheduledCount: stats[2],
        rtCount: stats[3]
      }
    }
    
  } catch (error) {
    console.error('Dashboard data error:', error)
    throw error
  }
}, {
  requiredEnvVars: ['DATABASE_URL']
})