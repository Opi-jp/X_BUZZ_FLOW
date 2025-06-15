import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  }
  
  // OpenAI APIテスト
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Reply with "OK" if you receive this.' }
        ],
        max_tokens: 10
      })
      
      results.tests.openai = {
        status: 'SUCCESS',
        response: completion.choices[0].message.content,
        model: completion.model,
        usage: completion.usage
      }
    } catch (error) {
      results.tests.openai = {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  } else {
    results.tests.openai = {
      status: 'NOT_CONFIGURED',
      error: 'OPENAI_API_KEY not found'
    }
  }
  
  // Perplexity APIテスト
  if (process.env.PERPLEXITY_API_KEY) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: 'Test connection. Reply with OK.'
            }
          ],
          max_tokens: 10
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        results.tests.perplexity = {
          status: 'SUCCESS',
          response: data.choices?.[0]?.message?.content || 'No content',
          model: data.model
        }
      } else {
        results.tests.perplexity = {
          status: 'FAILED',
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: await response.text()
        }
      }
    } catch (error) {
      results.tests.perplexity = {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  } else {
    results.tests.perplexity = {
      status: 'NOT_CONFIGURED',
      error: 'PERPLEXITY_API_KEY not found'
    }
  }
  
  // データベーステスト
  try {
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.cotSession.count()
    results.tests.database = {
      status: 'SUCCESS',
      cotSessionCount: count
    }
  } catch (error) {
    results.tests.database = {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // 環境変数の存在確認（値は表示しない）
  results.environment = {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasPerplexity: !!process.env.PERPLEXITY_API_KEY,
    hasGoogle: !!process.env.GOOGLE_API_KEY,
    hasGoogleEngine: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  }
  
  return NextResponse.json(results)
}