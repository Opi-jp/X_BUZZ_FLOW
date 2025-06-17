import { NextResponse } from 'next/server'
import { prisma } from '@/lib/generated/prisma'
import { env } from '@/lib/config/env'

// ニュース定期収集Cron
export async function GET(request: Request) {
  // Cron認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  try {
    console.log('[CRON] Starting news collection...')
    
    // NewsAPIが設定されているかチェック
    if (!env.NEWSAPI_KEY || env.NEWSAPI_KEY === 'demo') {
      console.log('[CRON] NewsAPI key not configured, using existing news')
      
      // 既存のニュースから10大ニュースを生成
      await generateTop10FromExisting()
      
      return NextResponse.json({
        message: 'Generated top 10 from existing news',
        timestamp: new Date().toISOString()
      })
    }
    
    // NewsAPIから新規収集
    const categories = ['AI', 'technology', 'business']
    const collectedArticles = []
    
    for (const category of categories) {
      try {
        const response = await fetch(
          `https://newsapi.org/v2/everything?` +
          `q=${category}&` +
          `language=ja&` +
          `sortBy=relevancy&` +
          `pageSize=10&` +
          `apiKey=${env.NEWSAPI_KEY}`,
          { cache: 'no-store' }
        )
        
        if (!response.ok) {
          console.error(`[CRON] NewsAPI error for ${category}:`, response.status)
          continue
        }
        
        const data = await response.json()
        
        for (const article of data.articles || []) {
          // URLで重複チェック
          const exists = await prisma.newsArticle.findUnique({
            where: { url: article.url }
          })
          
          if (!exists && article.title && article.url) {
            const created = await prisma.newsArticle.create({
              data: {
                url: article.url,
                title: article.title,
                description: article.description,
                sourceId: 'newsapi',
                sourceDomain: new URL(article.url).hostname,
                publishedAt: new Date(article.publishedAt),
                category,
                tags: [],
                importance: 0.5, // デフォルト値
                metadata: {
                  author: article.author,
                  urlToImage: article.urlToImage,
                  source: article.source
                }
              }
            })
            
            collectedArticles.push(created)
          }
        }
      } catch (error) {
        console.error(`[CRON] Error collecting ${category} news:`, error)
      }
    }
    
    console.log(`[CRON] Collected ${collectedArticles.length} new articles`)
    
    // 収集後、自動的に10大ニュースを生成
    if (collectedArticles.length > 0) {
      await generateTop10FromExisting()
    }
    
    return NextResponse.json({
      collected: collectedArticles.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[CRON] News collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 既存ニュースから10大ニュースを生成
async function generateTop10FromExisting() {
  try {
    // 本日の10大ニュースが既に生成されているかチェック
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existingThread = await prisma.newsThread.findFirst({
      where: {
        createdAt: { gte: today },
        title: { contains: '10大ニュース' }
      }
    })
    
    if (existingThread) {
      console.log('[CRON] Top 10 already generated today')
      return
    }
    
    // 10大ニュース生成APIを内部呼び出し
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/v2/news/top10`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        theme: 'AI',
        useExisting: true,
        format: 'thread'
      })
    })
    
    if (response.ok) {
      console.log('[CRON] Successfully generated top 10 news')
    } else {
      console.error('[CRON] Failed to generate top 10 news')
    }
  } catch (error) {
    console.error('[CRON] Top 10 generation error:', error)
  }
}

export const runtime = 'nodejs'
export const maxDuration = 60