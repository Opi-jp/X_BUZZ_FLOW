import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 簡易的なRSSパーサー
function parseRSS(xml: string) {
  const items: any[] = []
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  
  for (const item of itemMatches) {
    const title = item.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || ''
    const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || ''
    const description = item.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1') || ''
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
    const guid = item.match(/<guid.*?>(.*?)<\/guid>/)?.[1] || link

    if (title && (link || guid)) {
      items.push({
        title: title.trim(),
        link: (link || guid).trim(),
        description: description.trim(),
        pubDate: pubDate.trim(),
      })
    }
  }
  
  return items
}

// POST: RSS フィードから収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceId, limit = 10 } = body

    // RSSソースを取得
    const rssSources = await prisma.newsSource.findMany({
      where: {
        type: 'RSS',
        active: true,
        ...(sourceId && { id: sourceId })
      }
    })

    if (rssSources.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'アクティブなRSSソースが見つかりません'
      })
    }

    console.log(`Processing ${rssSources.length} RSS sources...`)

    let totalSaved = 0
    let totalSkipped = 0
    let totalErrors = 0

    // 各RSSフィードから収集
    for (const source of rssSources) {
      try {
        console.log(`Fetching RSS from ${source.name}...`)
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BuzzFlow/1.0)',
          },
          signal: AbortSignal.timeout(10000), // 10秒タイムアウト
        })

        if (!response.ok) {
          console.error(`Failed to fetch ${source.name}: ${response.status}`)
          totalErrors++
          continue
        }

        const text = await response.text()
        const items = parseRSS(text)
        
        console.log(`Found ${items.length} items in ${source.name}`)

        // AI関連のキーワード
        const aiKeywords = [
          'AI', 'artificial intelligence', 'ChatGPT', 'GPT', 'Claude', 
          'Anthropic', 'OpenAI', 'LLM', 'language model', 'machine learning',
          'deep learning', 'neural', 'ML', 'GenAI', 'generative',
          '人工知能', 'ディープラーニング', '機械学習', '生成AI'
        ]

        // 最新のlimit件のみ処理
        for (const item of items.slice(0, limit)) {
          try {
            // AI関連の記事かチェック
            const content = `${item.title} ${item.description}`.toLowerCase()
            const isAIRelated = aiKeywords.some(keyword => 
              content.includes(keyword.toLowerCase())
            )

            if (!isAIRelated && source.category !== 'Company') {
              continue // 企業ブログ以外はAI関連のみ
            }

            // URLが既に存在するかチェック
            const existing = await prisma.newsArticle.findUnique({
              where: { url: item.link }
            })

            if (!existing) {
              // HTMLタグを除去
              const cleanDescription = item.description
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .trim()

              await prisma.newsArticle.create({
                data: {
                  sourceId: source.id,
                  title: item.title.substring(0, 500),
                  summary: cleanDescription.substring(0, 1000),
                  content: cleanDescription,
                  url: item.link,
                  publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
                  category: source.category,
                }
              })
              totalSaved++
            } else {
              totalSkipped++
            }
          } catch (error) {
            console.error(`Error saving article from ${source.name}:`, error)
            totalErrors++
          }
        }
      } catch (error) {
        console.error(`Error processing ${source.name}:`, error)
        totalErrors++
      }
    }

    return NextResponse.json({
      success: true,
      sources: rssSources.length,
      saved: totalSaved,
      skipped: totalSkipped,
      errors: totalErrors,
      message: `${totalSaved}件の新しい記事を保存しました（${rssSources.length}ソースから）`
    })
  } catch (error) {
    console.error('Error collecting RSS:', error)
    return NextResponse.json(
      { error: 'Failed to collect RSS feeds', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}