import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // セッション統計
    const [totalSessions, completedSessions, failedSessions, processingSessions] = await Promise.all([
      prisma.cotSession.count(),
      prisma.cotSession.count({ where: { status: 'COMPLETED' } }),
      prisma.cotSession.count({ where: { status: 'FAILED' } }),
      prisma.cotSession.count({ where: { status: { in: ['THINKING', 'EXECUTING', 'INTEGRATING'] } } })
    ])

    // 下書き・投稿統計
    const [totalDrafts, publishedPosts, scheduledPosts] = await Promise.all([
      prisma.cotDraft.count(),
      prisma.cotDraft.count({ where: { status: 'POSTED' } }),
      prisma.cotDraft.count({ where: { status: 'SCHEDULED' } })
    ])

    // 最近のセッション（10件）
    const recentSessions = await prisma.cotSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        theme: true,
        platform: true,
        status: true,
        currentPhase: true,
        createdAt: true
      }
    })

    // 最近の下書き（10件）
    const recentDrafts = await prisma.cotDraft.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: {
            theme: true,
            platform: true
          }
        }
      }
    })

    // パフォーマンス統計（モックから実データへ移行予定）
    const avgEngagementRate = 5.8 // TODO: 実際のパフォーマンスデータから計算

    return NextResponse.json({
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        failed: failedSessions,
        processing: processingSessions,
        pending: totalSessions - completedSessions - failedSessions - processingSessions
      },
      content: {
        drafts: totalDrafts,
        published: publishedPosts,
        scheduled: scheduledPosts,
        avgEngagement: avgEngagementRate
      },
      recent: {
        sessions: recentSessions,
        drafts: recentDrafts
      }
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}