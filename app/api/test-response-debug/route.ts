import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    console.log('=== Response Debug Test ===')
    
    // シンプルなテスト
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: 'Search for one AI news article from June 2025 and return the title and URL in JSON format.',
      tools: [{ type: 'web_search' as any }],
      instructions: 'Use web_search tool. Return only JSON with title and url fields.'
    } as any)
    
    // 完全なレスポンスを返す
    return NextResponse.json({
      success: true,
      fullResponse: response,
      responseType: typeof response,
      isArray: Array.isArray(response),
      keys: Object.keys(response || {}),
      // outputフィールドの詳細
      outputInfo: {
        hasOutput: !!response.output,
        outputType: typeof response.output,
        outputIsArray: Array.isArray(response.output),
        outputLength: Array.isArray(response.output) ? response.output.length : null,
        outputItems: Array.isArray(response.output) ? 
          response.output.map((item: any) => ({
            type: item.type,
            id: item.id,
            status: item.status,
            hasContent: !!item.content,
            contentType: typeof item.content,
            hasResult: !!item.result
          })) : null
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.constructor.name
    }, { status: 500 })
  }
}