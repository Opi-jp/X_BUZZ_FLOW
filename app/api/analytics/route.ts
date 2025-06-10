import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: 投稿分析データ作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      scheduledPostId,
      impressions,
      likes,
      retweets,
      replies,
      profileClicks,
      linkClicks,
      aiAnalysis,
    } = body

    // エンゲージメント率計算
    const totalEngagements = likes + retweets + replies + profileClicks + linkClicks
    const engagementRate = impressions > 0 ? totalEngagements / impressions : 0

    const analytics = await prisma.postAnalytics.create({
      data: {
        scheduledPostId,
        impressions: impressions || 0,
        likes: likes || 0,
        retweets: retweets || 0,
        replies: replies || 0,
        profileClicks: profileClicks || 0,
        linkClicks: linkClicks || 0,
        engagementRate,
        aiAnalysis,
      },
    })

    return NextResponse.json(analytics, { status: 201 })
  } catch (error) {
    console.error('Error creating analytics:', error)
    return NextResponse.json(
      { error: 'Failed to create analytics' },
      { status: 500 }
    )
  }
}

// GET: 分析サマリー取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    const analytics = await prisma.postAnalytics.findMany({
      where: {
        measuredAt: {
          gte: dateFrom,
        },
      },
      include: {
        scheduledPost: {
          include: {
            refPost: true,
          },
        },
      },
      orderBy: { engagementRate: 'desc' },
    })

    // 集計データ
    const summary = {
      totalPosts: analytics.length,
      totalImpressions: analytics.reduce((sum, a) => sum + a.impressions, 0),
      totalLikes: analytics.reduce((sum, a) => sum + a.likes, 0),
      totalRetweets: analytics.reduce((sum, a) => sum + a.retweets, 0),
      avgEngagementRate: analytics.length > 0
        ? analytics.reduce((sum, a) => sum + a.engagementRate, 0) / analytics.length
        : 0,
    }

    return NextResponse.json({
      analytics,
      summary,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}