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
        hasOutput: !!(response as any).output,
        outputType: typeof (response as any).output,
        outputIsArray: Array.isArray((response as any).output),
        outputLength: Array.isArray((response as any).output) ? (response as any).output.length : null,
        outputItems: Array.isArray((response as any).output) ? 
          (response as any).output.map((item: any) => ({
            type: item.type,
            id: item.id,
            status: item.status,
            hasContent: !!item.content,
            contentType: typeof item.content,
            hasResult: !!item.result
          })) : null,
        // output_textフィールドもチェック
        hasOutputText: !!(response as any).output_text,
        outputTextType: typeof (response as any).output_text,
        outputTextPreview: (response as any).output_text ? 
          ((response as any).output_text as string).substring(0, 200) : null
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 })
  }
}