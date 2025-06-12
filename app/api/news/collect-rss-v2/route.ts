import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 改良されたRSSパーサー（既存のものと同じ）
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
    
    if (title && link) {
      items.push({
        title,
        link,
        description,
        pubDate,
      })
    }
  }
  
  return items
}

// POST: RSSフィードからニュースを収集（改善版）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sinceDate, batchSize = 5 } = body // バッチサイズを制限
    
    // アクティブなRSSソースを取得
    const rssSources = await prisma.newsSource.findMany({
      where: {
        type: 'RSS',
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    if (rssSources.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'アクティブなRSSソースが見つかりません'
      })
    }

    console.log(`Processing ${rssSources.length} RSS sources in batches of ${batchSize}...`)

    const results = {
      totalSaved: 0,
      totalSkipped: 0,
      totalErrors: 0,
      processedSources: 0,
      errorDetails: [] as { source: string; error: string }[],
      successfulSources: [] as string[],
    }

    // AI関連のキーワード
    const aiKeywords = [
      'AI', 'artificial intelligence', 'ChatGPT', 'GPT', 'Claude', 
      'Anthropic', 'OpenAI', 'LLM', 'language model', 'machine learning',
      'deep learning', 'neural', 'ML', 'GenAI', 'generative',
      '人工知能', 'ディープラーニング', '機械学習', '生成AI'
    ]

    // バッチ処理でソースを処理
    for (let i = 0; i < rssSources.length; i += batchSize) {
      const batch = rssSources.slice(i, i + batchSize)
      
      // バッチ内の各ソースを並列処理
      const batchPromises = batch.map(async (source) => {
        try {
          console.log(`Fetching RSS from ${source.name}...`)
          
          // タイムアウトを設定
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒タイムアウト
          
          const response = await fetch(source.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; BuzzFlow/1.0)',
              'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
            signal: controller.signal,
          })
          
          clearTimeout(timeoutId)

          if (!response.ok) {
            const error = `HTTP ${response.status}`
            console.error(`Failed to fetch ${source.name}: ${error}`)
            results.errorDetails.push({ source: source.name, error })
            results.totalErrors++
            return
          }

          const text = await response.text()
          const items = parseRSS(text)
          
          console.log(`Found ${items.length} items in ${source.name}`)
          
          let sourceSaved = 0

          // 最新の3件のみ処理（負荷軽減）
          for (const item of items.slice(0, 3)) {
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
                    results.totalSkipped++
                    continue
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
                results.totalSaved++
                sourceSaved++
              } else {
                results.totalSkipped++
              }
            } catch (error) {
              console.error(`Error saving article from ${source.name}:`, error)
              results.totalErrors++
            }
          }
          
          if (sourceSaved > 0) {
            results.successfulSources.push(`${source.name} (${sourceSaved}件)`)
          }
          results.processedSources++
          
        } catch (error: any) {
          const errorMessage = error.name === 'AbortError' ? 'タイムアウト' : error.message
          console.error(`Error processing ${source.name}:`, errorMessage)
          results.errorDetails.push({ source: source.name, error: errorMessage })
          results.totalErrors++
          results.processedSources++
        }
      })
      
      // バッチの処理を待つ
      await Promise.all(batchPromises)
      
      // バッチ間で1秒待機（サーバー負荷軽減）
      if (i + batchSize < rssSources.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 新しく保存された記事がある場合、自動分析を実行
    let analysisResult = null
    if (results.totalSaved > 0 && body.autoAnalyze !== false) {
      try {
        console.log(`Analyzing ${results.totalSaved} new articles...`)
        
        // 内部APIを呼び出して分析
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : process.env.NEXTAUTH_URL || 'http://localhost:3000'
          
        const analyzeResponse = await fetch(`${baseUrl}/api/news/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: Math.min(results.totalSaved, 10) }) // 最大10件ずつ
        })
        
        if (analyzeResponse.ok) {
          analysisResult = await analyzeResponse.json()
          console.log(`Analysis completed: ${analysisResult.analyzed} articles`)
        } else {
          console.error('Analysis failed:', await analyzeResponse.text())
        }
      } catch (analyzeError) {
        console.error('Auto-analysis error:', analyzeError)
      }
    }

    // 詳細なレスポンスを返す
    const response: any = {
      success: true,
      summary: {
        totalSources: rssSources.length,
        processedSources: results.processedSources,
        saved: results.totalSaved,
        skipped: results.totalSkipped,
        errors: results.totalErrors,
        analyzed: analysisResult?.analyzed || 0
      },
      message: `${results.totalSaved}件の新しい記事を保存しました（${results.processedSources}/${rssSources.length}ソース処理）${analysisResult ? `、${analysisResult.analyzed}件を分析しました` : ''}`,
    }

    // エラーがある場合は詳細を含める
    if (results.errorDetails.length > 0) {
      response.errorDetails = results.errorDetails
      response.successfulSources = results.successfulSources
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error collecting RSS:', error)
    return NextResponse.json(
      { 
        error: 'RSS収集中にエラーが発生しました', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}