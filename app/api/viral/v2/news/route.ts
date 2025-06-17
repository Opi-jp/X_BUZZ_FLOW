import { NextResponse } from 'next/server'
import { NewsStore } from '@/lib/news-store'

// ニュース記事API
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'search'

    switch (action) {
      case 'search':
        const articles = await NewsStore.searchArticles({
          theme: searchParams.get('theme') || undefined,
          keyword: searchParams.get('keyword') || undefined,
          startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
          endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
          sourceDomain: searchParams.get('sourceDomain') || undefined,
          limit: parseInt(searchParams.get('limit') || '50')
        })
        
        return NextResponse.json({ articles })

      case 'latest':
        const theme = searchParams.get('theme')
        if (!theme) {
          return NextResponse.json(
            { error: 'Theme is required for latest news' },
            { status: 400 }
          )
        }
        
        const latest = await NewsStore.getLatestByTheme(
          theme,
          parseInt(searchParams.get('limit') || '10')
        )
        
        return NextResponse.json({ articles: latest })

      case 'sources':
        const sourceStats = await NewsStore.getSourceStats(
          parseInt(searchParams.get('days') || '7')
        )
        
        return NextResponse.json({ sources: sourceStats })

      case 'trending':
        const trending = await NewsStore.getTrendingTopics(
          parseInt(searchParams.get('days') || '3')
        )
        
        return NextResponse.json({ trends: trending })

      case 'related':
        const articleId = searchParams.get('articleId')
        if (!articleId) {
          return NextResponse.json(
            { error: 'Article ID is required' },
            { status: 400 }
          )
        }
        
        const related = await NewsStore.findRelatedArticles(
          articleId,
          parseInt(searchParams.get('limit') || '5')
        )
        
        return NextResponse.json({ articles: related })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[News API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    )
  }
}

// ニュース記事の保存/更新
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, topics } = body

    if (!sessionId || !topics) {
      return NextResponse.json(
        { error: 'sessionId and topics are required' },
        { status: 400 }
      )
    }

    // トピックからニュース記事を抽出して保存
    const savedArticles = await NewsStore.saveFromTopics(sessionId, topics)

    return NextResponse.json({
      success: true,
      savedCount: savedArticles.length
    })

  } catch (error) {
    console.error('[News API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save news' },
      { status: 500 }
    )
  }
}