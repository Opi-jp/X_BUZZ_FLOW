import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('=== JSON Format Test Start ===')
    console.log('Note: Claude knowledge cutoff is April 2024')
    console.log('Current date is June 2025 - ignore "fictional" warnings')
    
    // テスト1: 文字列として渡す（現在の方法）
    const test1StartTime = Date.now()
    const stringPrompt = `web_searchツールを使用して、2025年6月の最新AIニュースを1件検索してください。
    
必ず以下のJSON形式で回答してください：
{
  "article": {
    "title": "記事タイトル",
    "url": "https://実際のURL",
    "date": "2025-06-XX",
    "summary": "要約"
  }
}`

    console.log('Test 1: String prompt')
    
    try {
      const response1 = await openai.responses.create({
        model: 'gpt-4o',
        input: stringPrompt,
        tools: [{ type: 'web_search' as any }],
        instructions: 'JSON形式で回答してください。'
      } as any)
      
      console.log('Test 1 Response type:', typeof response1)
      console.log('Test 1 Duration:', Date.now() - test1StartTime, 'ms')
      
      // レスポンス処理
      let result1 = null
      if (Array.isArray(response1)) {
        const messageItem = response1.find((item: any) => item.type === 'message')
        if (messageItem?.content?.[0]?.text) {
          const text = messageItem.content[0].text
          console.log('Test 1 Raw text:', text.substring(0, 200))
          
          // JSON抽出の複数パターン
          const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                           text.match(/```\n?([\s\S]*?)\n?```/) ||
                           text.match(/\{[\s\S]*\}/)
          
          if (jsonMatch) {
            try {
              result1 = JSON.parse(jsonMatch[1] || jsonMatch[0])
              console.log('Test 1 Parsed successfully')
            } catch (e) {
              console.error('Test 1 Parse error:', e)
            }
          }
        }
      }
      
      // テスト2: JSONオブジェクトとして構造化してみる
      const test2StartTime = Date.now()
      const structuredPrompt = {
        task: "web_searchツールを使用して、2025年6月の最新AIニュースを1件検索",
        outputFormat: {
          article: {
            title: "string",
            url: "string (https://...)",
            date: "string (YYYY-MM-DD)",
            summary: "string"
          }
        },
        requirements: [
          "実在する記事のみ",
          "2025年6月の記事",
          "URLは実際のものを使用"
        ]
      }
      
      console.log('\nTest 2: Structured prompt as JSON string')
      
      const response2 = await openai.responses.create({
        model: 'gpt-4o',
        input: JSON.stringify(structuredPrompt),
        tools: [{ type: 'web_search' as any }],
        instructions: 'The input is a JSON object. Parse it and respond in the same JSON format as specified in outputFormat.'
      } as any)
      
      console.log('Test 2 Duration:', Date.now() - test2StartTime, 'ms')
      
      // テスト3: システムメッセージ風のアプローチ
      const test3StartTime = Date.now()
      const systemStylePrompt = `You are a web search assistant. Your response must be valid JSON only, no additional text.

Task: Search for one latest AI news article from June 2025.

Output this exact JSON structure:
{
  "article": {
    "title": "<actual article title>",
    "url": "<actual URL>",
    "date": "<YYYY-MM-DD>",
    "summary": "<brief summary>"
  }
}`
      
      console.log('\nTest 3: System-style prompt')
      
      const response3 = await openai.responses.create({
        model: 'gpt-4o',
        input: systemStylePrompt,
        tools: [{ type: 'web_search' as any }],
        instructions: 'Output only valid JSON, no markdown, no explanation.'
      } as any)
      
      console.log('Test 3 Duration:', Date.now() - test3StartTime, 'ms')
      
      // 結果をまとめて返す
      return NextResponse.json({
        success: true,
        tests: {
          test1: {
            method: 'String prompt (Japanese)',
            success: !!result1,
            hasUrl: !!result1?.article?.url,
            result: result1
          },
          test2: {
            method: 'Structured JSON input',
            responseType: typeof response2,
            raw: JSON.stringify(response2).substring(0, 200)
          },
          test3: {
            method: 'System-style prompt (English)',
            responseType: typeof response3,
            raw: JSON.stringify(response3).substring(0, 200)
          }
        },
        recommendation: determineRecommendation(result1, response2, response3)
      })
      
    } catch (error) {
      console.error('Test error:', error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: 'Fatal error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function determineRecommendation(result1: any, response2: any, response3: any): string {
  // 注意: Claudeの知識は2024年4月までなので、2025年6月のニュースを
  // 「架空」と判断する可能性があります。URLの存在で判断してください。
  
  if (result1?.article?.url && result1.article.url.startsWith('https://')) {
    return 'Test 1 成功: URLが取得できています（実在性はURLで判断）'
  }
  
  // 各テストの結果を機械的に評価
  const test2HasUrl = extractUrlFromResponse(response2)
  const test3HasUrl = extractUrlFromResponse(response3)
  
  if (test2HasUrl) {
    return 'Test 2 (Structured JSON) のアプローチが有効です'
  }
  
  if (test3HasUrl) {
    return 'Test 3 (English prompt) のアプローチが有効です'
  }
  
  return 'JSON解析ロジックの改善が必要です。gpt-response-parser.tsの使用を推奨'
}

function extractUrlFromResponse(response: any): string | null {
  try {
    const text = JSON.stringify(response)
    const urlMatch = text.match(/https?:\/\/[^\s"']+/)
    return urlMatch ? urlMatch[0] : null
  } catch {
    return null
  }
}

// デバッグ用のGETエンドポイント
export async function GET() {
  return NextResponse.json({
    message: 'JSON Format Test Endpoint',
    description: 'POST to this endpoint to test different JSON formatting approaches',
    tests: [
      'Test 1: Japanese string prompt',
      'Test 2: Structured JSON input',
      'Test 3: English system-style prompt'
    ]
  })
}