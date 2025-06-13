import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    const config = {
      expertise: 'AIとクリエイティブディレクション',
      platform: 'Twitter',
      style: '洞察的'
    }
    
    // 現在の日付を明確に
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0] // 2025-06-12
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    console.log('=== Latest News Test ===')
    console.log('Current date:', currentDate)
    console.log('Search range:', sevenDaysAgo, 'to', currentDate)
    
    const startTime = Date.now()
    
    // より具体的な日付指定のプロンプト
    const prompt = `
あなたは${config.expertise || 'AIとクリエイティブディレクション'}の専門家です。
現在の日付: ${currentDate}
時刻: ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

【重要】web_searchツールを使用して、以下の検索を実行してください：

検索クエリの例：
- "AI news ${currentDate}"
- "artificial intelligence June 2025"
- "AI技術 最新ニュース 2025年6月"
- "tech news today June 12 2025"
- "AI創造性 クリエイティブ 最新"

必ず${sevenDaysAgo}から${currentDate}の期間の記事を5件検索してください。

以下のJSON形式で回答（Markdownブロック不要）：
{
  "searchQueries": ["実際に使用した検索クエリ"],
  "articleAnalysis": [
    {
      "title": "実際の記事タイトル",
      "url": "https://実際のURL",
      "publishDate": "YYYY-MM-DD（必須：${sevenDaysAgo}以降）",
      "source": "メディア名",
      "summary": "100文字程度の要約（日本語）",
      "expertPerspective": "${config.expertise || 'AIとクリエイティブディレクション'}の専門家として：[具体的な洞察]",
      "viralPotential": "X(Twitter)でバズる理由：[具体的な理由]"
    }
  ],
  "dateRange": {
    "from": "${sevenDaysAgo}",
    "to": "${currentDate}",
    "articlesInRange": 数値
  },
  "summary": "全体のまとめ（${config.expertise || 'AIとクリエイティブディレクション'}の視点から）"
}`

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: prompt,
      tools: [{ type: 'web_search' as any }],
      instructions: `
CRITICAL: Use web_search with date-specific queries.
Focus on articles from the last 7 days ONLY.
Include the exact publish date for each article.
Return pure JSON without markdown blocks.`
    } as any)
    
    const duration = Date.now() - startTime
    
    // output_textを解析
    let result = null
    if (response.output_text) {
      try {
        // Markdownブロックを除去
        let cleanText = response.output_text
        if (cleanText.includes('```')) {
          const match = cleanText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
          if (match) {
            cleanText = match[1]
          }
        }
        
        result = JSON.parse(cleanText.trim())
      } catch (e) {
        console.error('Parse error:', e)
        console.log('Raw text:', response.output_text.substring(0, 500))
      }
    }
    
    if (result && result.articleAnalysis) {
      // 日付の検証
      const validDates = result.articleAnalysis.filter((a: any) => {
        if (!a.publishDate) return false
        const date = new Date(a.publishDate)
        const sevenDaysAgoDate = new Date(sevenDaysAgo)
        return date >= sevenDaysAgoDate
      })
      
      // テーマの反映確認
      const hasTheme = result.articleAnalysis.filter((a: any) => 
        a.expertPerspective && 
        (a.expertPerspective.includes(config.expertise) || 
         a.expertPerspective.includes('クリエイティブ') ||
         a.expertPerspective.includes('AI'))
      )
      
      return NextResponse.json({
        success: true,
        duration: duration + 'ms',
        searchRange: {
          from: sevenDaysAgo,
          to: currentDate,
          daysSearched: 7
        },
        config: config,
        stats: {
          totalArticles: result.articleAnalysis.length,
          articlesWithValidDates: validDates.length,
          articlesWithTheme: hasTheme.length,
          searchQueries: result.searchQueries || []
        },
        articles: result.articleAnalysis,
        dateRange: result.dateRange,
        summary: result.summary,
        checkPoints: {
          '1. 実在記事のURL取得': result.articleAnalysis.every((a: any) => a.url && a.url.startsWith('http')),
          '2. 最新記事（7日以内）': validDates.length > 0,
          '3. テーマ設定の反映': hasTheme.length === result.articleAnalysis.length
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      duration: duration + 'ms',
      error: 'No articles found',
      rawResponse: response.output_text?.substring(0, 1000)
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}