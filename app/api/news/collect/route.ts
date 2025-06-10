import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// NewsAPI設定
const NEWSAPI_KEY = process.env.NEWSAPI_KEY
const NEWSAPI_URL = 'https://newsapi.org/v2/everything'

// POST: ニュース収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceId } = body

    // デフォルトのNewsAPIソースを作成（なければ）
    let newsApiSource = await prisma.newsSource.findFirst({
      where: { type: 'API', name: 'NewsAPI' }
    })

    if (!newsApiSource) {
      newsApiSource = await prisma.newsSource.create({
        data: {
          name: 'NewsAPI',
          url: 'https://newsapi.org',
          type: 'API',
          category: 'AI',
        }
      })
    }

    // NewsAPIからAI関連ニュースを取得
    const searchQuery = 'AI OR "artificial intelligence" OR ChatGPT OR "machine learning" OR LLM'
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 1) // 過去24時間

    const newsApiUrl = `${NEWSAPI_URL}?q=${encodeURIComponent(searchQuery)}&from=${fromDate.toISOString()}&sortBy=popularity&language=en&pageSize=50`

    const response = await fetch(newsApiUrl, {
      headers: {
        'X-Api-Key': NEWSAPI_KEY || ''
      }
    })

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`)
    }

    const data = await response.json()
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
              summary: article.description || '',
              content: article.content || article.description || '',
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
      { error: 'Failed to collect news' },
      { status: 500 }
    )
  }
}