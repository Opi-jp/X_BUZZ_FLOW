import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 改良されたRSSパーサー
function parseRSS(xml: string) {
  const items: any[] = []
  
  // RSS 2.0 形式のアイテムを取得
  let itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  
  // Atom 形式もサポート
  if (itemMatches.length === 0) {
    itemMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []
  }
  
  for (const item of itemMatches) {
    // CDATA処理を改善
    const extractContent = (tag: string) => {
      const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
      const match = item.match(pattern)
      if (!match) return ''
      
      let content = match[1]
      // CDATAを処理
      content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      // HTMLエンティティをデコード
      content = content
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
      
      return content.trim()
    }
    
    // RSS 2.0 形式
    let title = extractContent('title')
    let link = extractContent('link')
    let description = extractContent('description') || extractContent('summary')
    let pubDate = extractContent('pubDate') || extractContent('published') || extractContent('updated')
    
    // Atom形式の場合
    if (!link && item.includes('<link')) {
      const linkMatch = item.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/>/) ||
                       item.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/)
      if (linkMatch) link = linkMatch[1]
    }
    
    const guid = extractContent('guid') || extractContent('id') || link

    if (title && (link || guid)) {
      items.push({
        title,
        link: link || guid,
        description,
        pubDate,
      })
    }
  }
  
  return items
}

// POST: RSS フィードから収集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceId, limit = 10, sinceDate } = body

    // RSSソースを取得
    const rssSources = await prisma.newsSource.findMany({
      where: {
        type: 'RSS',
        active: true,
        ...(sourceId && { id: sourceId })
      },
      take: 2 // 一度に処理するソースを2つに制限（タイムアウト回避）
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
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
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

        // 最新の5件のみ処理（各ソースから少量ずつ取得）
        for (const item of items.slice(0, 5)) {
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

              // 公開日時を解析
              const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date()
              
              // 日付フィルタリング
              if (sinceDate) {
                const sinceDateObj = new Date(sinceDate)
                if (publishedAt < sinceDateObj) {
                  skippedCount++
                  continue // 指定日より古い記事はスキップ
                }
              }

              await prisma.newsArticle.create({
                data: {
                  sourceId: source.id,
                  title: item.title.substring(0, 500),
                  summary: cleanDescription.substring(0, 1000),
                  content: cleanDescription,
                  url: item.link,
                  publishedAt,
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