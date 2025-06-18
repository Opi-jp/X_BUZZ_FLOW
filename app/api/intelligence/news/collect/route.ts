import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// NewsAPI設定
const NEWSAPI_KEY = process.env.NEWSAPI_KEY
const NEWSAPI_URL = 'https://newsapi.org/v2/everything'

// POST: ニュース収集
export async function POST(request: NextRequest) {
  try {
    // APIキーの確認
    if (!NEWSAPI_KEY) {
      console.error('NEWSAPI_KEY is not set')
      return NextResponse.json(
        { 
          error: 'NewsAPI key is not configured',
          details: 'NEWSAPI_KEY環境変数が設定されていません'
        },
        { status: 500 }
      )
    }
    const body = await request.json()
    const { sourceId } = body

    // デフォルトのNewsAPIソースを作成（なければ）
    let newsApiSource = await prisma.newsSource.findFirst({
      where: { name: 'NewsAPI' }
    })

    if (!newsApiSource) {
      newsApiSource = await prisma.newsSource.create({
        data: {
          name: 'NewsAPI',
          url: 'https://newsapi.org',
          rssUrl: 'https://newsapi.org/v2/everything',
          category: 'AI',
        }
      })
    }

    // NewsAPIからAI関連ニュースを取得
    const searchQuery = 'AI OR "artificial intelligence" OR ChatGPT OR "machine learning" OR LLM OR OpenAI OR Anthropic'
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 7) // 過去7日間に拡大

    // NewsAPIの無料プランの制限を考慮
    const newsApiUrl = `${NEWSAPI_URL}?q=${encodeURIComponent(searchQuery)}&from=${fromDate.toISOString()}&sortBy=publishedAt&pageSize=20`

    console.log('NewsAPI URL:', newsApiUrl)
    console.log('NewsAPI Key exists:', !!NEWSAPI_KEY)

    const response = await fetch(newsApiUrl, {
      headers: {
        'X-Api-Key': NEWSAPI_KEY || ''
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('NewsAPI response error:', response.status, errorText)
      
      // NewsAPIの一般的なエラーをチェック
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'NewsAPI authentication failed',
            details: 'APIキーが無効です'
          },
          { status: 401 }
        )
      } else if (response.status === 429) {
        return NextResponse.json(
          { 
            error: 'NewsAPI rate limit exceeded',
            details: 'レート制限に達しました。後で再試行してください'
          },
          { status: 429 }
        )
      } else if (response.status === 426) {
        return NextResponse.json(
          { 
            error: 'NewsAPI plan limitation',
            details: '無料プランではこの機能は利用できません'
          },
          { status: 426 }
        )
      }
      
      throw new Error(`NewsAPI error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('NewsAPI response:', { status: data.status, totalResults: data.totalResults, articles: data.articles?.length })
    const articles = data.articles || []

    // 記事を保存
    let savedCount = 0
    let skippedCount = 0

    for (const article of articles) {
      try {
        // URLが既に存在するかチェック
        const existing = await prisma.newsArticle.findUnique({
          where: { url: article.url }
        })

        if (!existing && article.title && article.url) {
          await prisma.newsArticle.create({
            data: {
              sourceId: newsApiSource.id,
              title: article.title,
              description: article.description || '',
              url: article.url,
              publishedAt: new Date(article.publishedAt),
              category: 'AI',
            }
          })
          savedCount++
        } else {
          skippedCount++
        }
      } catch (error) {
        console.error('Error saving article:', error)
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      totalFetched: articles.length,
      saved: savedCount,
      skipped: skippedCount,
      message: `${savedCount}件の新しい記事を保存しました`
    })
  } catch (error) {
    console.error('Error collecting news:', error)
    return NextResponse.json(
      { 
        error: 'Failed to collect news',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}