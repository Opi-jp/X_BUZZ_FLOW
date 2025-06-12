import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    console.log('=== Simple OpenAI Test ===')
    console.log('API Key exists:', !!process.env.OPENAI_API_KEY)
    console.log('API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10))
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    // 1. 基本的なChat Completions APIテスト
    console.log('Testing basic chat completion...')
    try {
      const chatResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10
      })
      
      console.log('Chat completion success:', chatResponse.choices[0].message.content)
    } catch (error) {
      console.error('Chat completion error:', error.message)
    }
    
    // 2. Responses APIテスト（web_searchなし）
    console.log('\nTesting Responses API without web_search...')
    try {
      const responsesResult = await openai.responses.create({
        model: 'gpt-4o',
        input: 'What is 2+2?'
      } as any)
      
      console.log('Responses API result type:', typeof responsesResult)
      console.log('Is array:', Array.isArray(responsesResult))
      console.log('Keys:', Object.keys(responsesResult || {}))
    } catch (error) {
      console.error('Responses API error:', error.message)
    }
    
    // 3. Responses API with web_search
    console.log('\nTesting Responses API with web_search...')
    try {
      const webSearchResult = await openai.responses.create({
        model: 'gpt-4o',
        input: 'Find one AI news from today',
        tools: [{ type: 'web_search' as any }]
      } as any)
      
      console.log('Web search result received')
      console.log('Type:', typeof webSearchResult)
      
      if (Array.isArray(webSearchResult)) {
        console.log('Array length:', webSearchResult.length)
        webSearchResult.forEach((item, i) => {
          console.log(`Item ${i} type:`, item.type)
          if (item.type === 'message' && item.content?.[0]?.text) {
            console.log('Text preview:', item.content[0].text.substring(0, 100))
          }
        })
      }
    } catch (error) {
      console.error('Web search error:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Check server logs for detailed results',
      apiKeyConfigured: !!process.env.OPENAI_API_KEY
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}