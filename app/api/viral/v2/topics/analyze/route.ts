import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme')
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 指定期間内のトピックを取得
    const sessions = await prisma.viralSession.findMany({
      where: {
        topics: { not: null },
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        },
        ...(theme ? { theme } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        theme: true,
        createdAt: true,
        topics: true
      }
    })

    // トピックデータを分析
    const allTopics: any[] = []
    const keywordFrequency: Record<string, number> = {}
    const sourceFrequency: Record<string, number> = {}
    const dateDistribution: Record<string, number> = {}

    sessions.forEach(session => {
      const topics = (session.topics as any).parsed || []
      topics.forEach((topic: any) => {
        allTopics.push({
          sessionId: session.id,
          theme: session.theme,
          ...topic
        })

        // キーワード頻度
        if (topic.keyPoints) {
          topic.keyPoints.forEach((keyword: string) => {
            keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1
          })
        }

        // ソース頻度
        if (topic.url) {
          const domain = new URL(topic.url).hostname
          sourceFrequency[domain] = (sourceFrequency[domain] || 0) + 1
        }

        // 日付分布
        if (topic.date) {
          const date = topic.date.split('T')[0]
          dateDistribution[date] = (dateDistribution[date] || 0) + 1
        }
      })
    })

    // 頻度の高い順にソート
    const sortedKeywords = Object.entries(keywordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }))

    const sortedSources = Object.entries(sourceFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({ source, count }))

    return NextResponse.json({
      summary: {
        totalSessions: sessions.length,
        totalTopics: allTopics.length,
        dateRange: {
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      },
      topKeywords: sortedKeywords,
      topSources: sortedSources,
      dateDistribution,
      topics: allTopics
    })

  } catch (error) {
    console.error('[Topics Analysis] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze topics' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { themes, startDate, endDate } = await request.json()

    // 複数テーマの比較分析
    const sessions = await prisma.viralSession.findMany({
      where: {
        topics: { not: null },
        theme: themes ? { in: themes } : undefined,
        createdAt: {
          gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: endDate ? new Date(endDate) : new Date()
        }
      },
      select: {
        id: true,
        theme: true,
        createdAt: true,
        topics: true
      }
    })

    // テーマ別の分析
    const themeAnalysis: Record<string, any> = {}

    sessions.forEach(session => {
      if (!themeAnalysis[session.theme]) {
        themeAnalysis[session.theme] = {
          sessionCount: 0,
          topicCount: 0,
          keywords: {},
          sources: {},
          trends: []
        }
      }

      const analysis = themeAnalysis[session.theme]
      analysis.sessionCount++

      const topics = (session.topics as any).parsed || []
      analysis.topicCount += topics.length

      topics.forEach((topic: any) => {
        // キーワード集計
        if (topic.keyPoints) {
          topic.keyPoints.forEach((keyword: string) => {
            analysis.keywords[keyword] = (analysis.keywords[keyword] || 0) + 1
          })
        }

        // ソース集計
        if (topic.url) {
          const domain = new URL(topic.url).hostname
          analysis.sources[domain] = (analysis.sources[domain] || 0) + 1
        }

        // トレンド情報
        analysis.trends.push({
          topic: topic.TOPIC,
          date: topic.date,
          summary: topic.summary
        })
      })
    })

    // 各テーマのトップキーワードを抽出
    Object.keys(themeAnalysis).forEach(theme => {
      const analysis = themeAnalysis[theme]
      analysis.topKeywords = Object.entries(analysis.keywords)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }))
      
      analysis.topSources = Object.entries(analysis.sources)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([source, count]) => ({ source, count }))

      delete analysis.keywords
      delete analysis.sources
    })

    return NextResponse.json({
      themes: Object.keys(themeAnalysis),
      analysis: themeAnalysis,
      totalSessions: sessions.length
    })

  } catch (error) {
    console.error('[Topics Analysis] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze topics' },
      { status: 500 }
    )
  }
}