import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// トピックプールから最適なトピックを取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme')
    const freshOnly = searchParams.get('fresh') === 'true'

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme parameter is required' },
        { status: 400 }
      )
    }

    // 最新の有効なトピックを検索
    const cutoffDate = freshOnly 
      ? new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7日以内

    const sessions = await prisma.viralSession.findMany({
      where: {
        theme,
        topics: { not: null },
        createdAt: { gte: cutoffDate }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        topics: true
      }
    })

    if (sessions.length === 0) {
      return NextResponse.json({
        available: false,
        message: 'No recent topics found for this theme'
      })
    }

    // 最新のトピックを返す
    const latestSession = sessions[0]
    const topics = latestSession.topics as any

    // 使用回数をカウント（同じトピックがどれだけ使われているか）
    const usageCount = await prisma.viralSession.count({
      where: {
        theme,
        topics: { equals: topics },
        createdAt: { gte: cutoffDate }
      }
    })

    return NextResponse.json({
      available: true,
      sourceSessionId: latestSession.id,
      createdAt: latestSession.createdAt,
      usageCount,
      topics,
      freshness: {
        hoursAgo: Math.floor((Date.now() - new Date(latestSession.createdAt).getTime()) / (1000 * 60 * 60)),
        isFresh: new Date(latestSession.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    })

  } catch (error) {
    console.error('[Topics Pool] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from topics pool' },
      { status: 500 }
    )
  }
}

// トピックの鮮度チェック
export async function POST(request: Request) {
  try {
    const { theme, forceRefresh = false } = await request.json()

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme is required' },
        { status: 400 }
      )
    }

    // 既存のトピックの鮮度をチェック
    const recentSession = await prisma.viralSession.findFirst({
      where: {
        theme,
        topics: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以内
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (recentSession && !forceRefresh) {
      // 24時間以内のトピックがある場合は再利用を推奨
      return NextResponse.json({
        needsRefresh: false,
        recommendation: 'reuse',
        existingSessionId: recentSession.id,
        lastUpdated: recentSession.createdAt,
        hoursAgo: Math.floor((Date.now() - new Date(recentSession.createdAt).getTime()) / (1000 * 60 * 60))
      })
    }

    // 古いトピックの統計
    const oldSessions = await prisma.viralSession.findMany({
      where: {
        theme,
        topics: { not: null },
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        createdAt: true
      }
    })

    return NextResponse.json({
      needsRefresh: true,
      recommendation: 'fetch_new',
      reason: recentSession ? 'Force refresh requested' : 'No recent topics found',
      statistics: {
        totalOldSessions: oldSessions.length,
        oldestDate: oldSessions[oldSessions.length - 1]?.createdAt,
        newestDate: oldSessions[0]?.createdAt
      }
    })

  } catch (error) {
    console.error('[Topics Freshness Check] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check topics freshness' },
      { status: 500 }
    )
  }
}