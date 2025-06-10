import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST: RSS フィードを順次収集（1つずつ処理）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { offset = 0 } = body

    // 1つのRSSソースのみ取得
    const rssSources = await prisma.newsSource.findMany({
      where: {
        type: 'RSS',
        active: true
      },
      skip: offset,
      take: 1, // 1つずつ処理
      orderBy: { name: 'asc' } // 安定した順序
    })

    if (rssSources.length === 0) {
      return NextResponse.json({
        success: true,
        message: '全てのRSSソースの収集が完了しました',
        hasMore: false,
        nextOffset: offset
      })
    }

    const source = rssSources[0]
    console.log(`Processing RSS source: ${source.name} (offset: ${offset})`)

    let saved = 0
    let skipped = 0
    let error = null

    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BuzzFlow/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(8000), // 8秒タイムアウト
      })

      if (!response.ok) {
        error = `HTTP ${response.status}`
      } else {
        const text = await response.text()
        
        // 簡易パーサー（最初の5件のみ）
        const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || []
        
        for (let i = 0; i < Math.min(5, itemMatches.length); i++) {
          const item = itemMatches[i]
          const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') || ''
          const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || ''
          const description = item.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') || ''
          
          if (title && link) {
            // URLが既に存在するかチェック
            const existing = await prisma.newsArticle.findUnique({
              where: { url: link }
            })

            if (!existing) {
              // HTMLタグを除去
              const cleanDescription = description
                .replace(/<[^>]*>/g, '')
                .replace(/&[^;]+;/g, ' ')
                .trim()

              // AI関連キーワードチェック
              const aiKeywords = ['AI', 'ChatGPT', 'GPT', 'Claude', 'LLM', 'machine learning', '人工知能', '機械学習']
              const content = `${title} ${cleanDescription}`.toLowerCase()
              const isAIRelated = aiKeywords.some(keyword => content.includes(keyword.toLowerCase()))

              if (isAIRelated || source.category === 'Company') {
                await prisma.newsArticle.create({
                  data: {
                    sourceId: source.id,
                    title: title.substring(0, 500),
                    summary: cleanDescription.substring(0, 1000),
                    content: cleanDescription,
                    url: link,
                    publishedAt: new Date(),
                    category: source.category,
                  }
                })
                saved++
              }
            } else {
              skipped++
            }
          }
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Error processing ${source.name}:`, err)
    }

    // 残りのソース数を確認
    const totalSources = await prisma.newsSource.count({
      where: { type: 'RSS', active: true }
    })
    const hasMore = offset + 1 < totalSources

    return NextResponse.json({
      success: true,
      source: source.name,
      saved,
      skipped,
      error,
      hasMore,
      nextOffset: offset + 1,
      progress: {
        current: offset + 1,
        total: totalSources,
        percentage: Math.round(((offset + 1) / totalSources) * 100)
      }
    })
  } catch (error) {
    console.error('Error in sequential RSS collection:', error)
    return NextResponse.json(
      { error: 'Failed to collect RSS', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}