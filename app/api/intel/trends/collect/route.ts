import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PerplexityClient } from '@/lib/perplexity'
import { ErrorManager, DBManager, PromptManager } from '@/lib/core/unified-system-manager'
import { ClaudeLogger } from '@/lib/core/claude-logger'

export async function POST(request: Request) {
  let sessionId: string | undefined
  
  try {
    // API キーのチェック
    if (!process.env.PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not set in environment variables')
      return NextResponse.json(
        { 
          error: 'Configuration error',
          message: 'Perplexity API key is not configured'
        },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    sessionId = body.sessionId
    const { theme, platform = 'Twitter', style = 'エンターテイメント' } = body
    
    if (!sessionId || !theme) {
      return NextResponse.json(
        { error: 'Session ID and theme are required' },
        { status: 400 }
      )
    }
    
    // セッションを取得
    const session = await prisma.viral_sessions.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // topicsデータが既に存在する場合はスキップ
    if (session.topics) {
      return NextResponse.json(
        { 
          message: 'Topics already collected', 
          success: true,
          topics: session.topics
        },
        { status: 200 }
      )
    }

    ClaudeLogger.info(
      { module: 'backend', operation: 'perplexity-start' },
      '🔍 Starting Perplexity collection',
      { sessionId, theme }
    )

    // プロンプトをロード
    const prompt = await PromptManager.load(
      'perplexity/collect-topics.txt',
      { theme, platform, style },
      { validate: true }
    )

    // Perplexity APIを使用してトピックを収集
    const perplexity = new PerplexityClient()
    const response = await perplexity.createCompletion([
      {
        role: 'user',
        content: prompt
      }
    ], {
      model: 'llama-3.1-sonar-large-128k-online',
      temperature: 0.7,
      max_tokens: 4000
    })

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No content in Perplexity response')
    }

    const rawContent = response.choices[0].message.content

    // Perplexityのレスポンスをパース（解決済みパーサー使用）
    const { PerplexityResponseParser } = await import('@/lib/parsers/perplexity-response-parser')
    const parsedTopics = PerplexityResponseParser.parseTopics(rawContent)
    
    const parsedData = {
      topics: parsedTopics,
      summary: `${parsedTopics.length}件のトピックを収集`,
      perplexityAnalysis: rawContent,
      timestamp: new Date().toISOString()
    }

    // セッションを更新
    const updatedSession = await DBManager.transaction(async (tx) => {
      return await tx.viral_sessions.update({
        where: { id: sessionId },
        data: {
          topics: parsedData as any,
          status: 'TOPICS_COLLECTED'
        }
      })
    })

    ClaudeLogger.success(
      { module: 'backend', operation: 'perplexity-complete', sessionId },
      '✅ Perplexity collection completed',
      0,
      { topicCount: parsedData.topics?.length || 0 }
    )

    return NextResponse.json({
      success: true,
      sessionId,
      topics: parsedData,
      nextStep: 'concepts'
    })
  } catch (error: any) {
    ClaudeLogger.error(
      { module: 'backend', operation: 'perplexity-error' },
      '💥 Perplexity collection failed',
      error
    )
    
    await ErrorManager.logError(error, {
      module: 'backend',
      operation: 'trends-collect',
      metadata: { sessionId }
    })
    
    return NextResponse.json(
      { error: 'Failed to collect topics', details: error.message },
      { status: 500 }
    )
  }
}