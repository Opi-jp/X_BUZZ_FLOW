import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    console.log('Testing Responses API with web_search...')
    const startTime = Date.now()

    // Responses APIを使用してWeb検索を実行
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: '今日（2025年6月6日）のAI関連の最新ニュースを3件教えてください。実際のニュースタイトル、ソース、URLを含めてください。',
      tools: [
        {
          type: 'web_search'
        }
      ]
    })

    const duration = Date.now() - startTime
    console.log('Response received:', response)

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      response: response.output || response,
      metadata: {
        model: 'gpt-4o',
        tools: ['web_search']
      }
    })

  } catch (error) {
    console.error('Web search test error:', error)
    
    return NextResponse.json(
      { 
        error: 'Web search test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}