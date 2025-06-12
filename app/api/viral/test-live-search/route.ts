import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    console.log('=== Live Search Test ===')
    console.log('Timestamp:', new Date().toISOString())
    
    // 現在時刻を含む具体的な検索クエリ
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    
    const searchPrompt = `
Current exact time: ${today.toISOString()}

Use web_search to find:
1. One AI news article from today (${dateStr}) or yesterday
2. Include the EXACT URL from search results
3. The article must be real and accessible

Search query suggestions:
- "AI news ${dateStr}"
- "artificial intelligence today"
- "OpenAI news June 2025"
- "tech news ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}"

Return ONLY this JSON:
{
  "timestamp": "${today.toISOString()}",
  "article": {
    "title": "exact title from search",
    "url": "https://... (exact URL)",
    "date": "YYYY-MM-DD",
    "found_via_query": "the search query that found this"
  }
}`

    console.log('Sending request to OpenAI...')
    const startTime = Date.now()
    
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: searchPrompt,
      tools: [{ type: 'web_search' as any }],
      instructions: 'Return only valid JSON. Use web_search to find a real, current article.'
    } as any)
    
    const duration = Date.now() - startTime
    console.log('Response received in:', duration, 'ms')
    
    // レスポンスから結果を抽出
    let result = null
    let rawText = ''
    
    if (Array.isArray(response)) {
      const messageItem = response.find((item: any) => item.type === 'message')
      if (messageItem?.content?.[0]?.text) {
        rawText = messageItem.content[0].text
        console.log('Raw response:', rawText.substring(0, 500))
        
        // JSON抽出
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0])
            console.log('Parsed result:', result)
          } catch (e) {
            console.error('Parse error:', e)
          }
        }
      }
    }
    
    // キャッシュ無効化ヘッダー
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    }
    
    return NextResponse.json({
      success: !!result?.article?.url,
      testTime: today.toISOString(),
      duration: duration + 'ms',
      result: result,
      debug: {
        hasUrl: !!result?.article?.url,
        urlValid: result?.article?.url?.startsWith('https://'),
        isRecent: result?.article?.date,
        rawResponseLength: rawText.length,
        rawResponsePreview: rawText.substring(0, 200)
      },
      instructions: [
        'This endpoint tests live web search without caching',
        'Each request should return different/current results',
        'Check if URL is real by opening in browser'
      ]
    }, { headers })
    
  } catch (error) {
    console.error('Test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      suggestion: 'Check API key and GPT-4o access'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  }
}

// POSTメソッドも追加（パラメータを渡したい場合）
export async function POST() {
  // GETと同じ処理だが、キャッシュを完全に回避
  return GET()
}