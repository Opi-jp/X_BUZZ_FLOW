import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claudeLog } from '@/lib/core/claude-logger'

export async function POST(request: Request) {
  const apiCall = claudeLog.logApiCall('POST', '/api/flow')
  const startTime = apiCall.start()
  
  try {
    claudeLog.info(
      { module: 'api', operation: 'parse-body' },
      '📝 Parsing request body'
    )
    
    const body = await request.json()
    const { theme, platform = 'Twitter', style = 'エンターテイメント' } = body

    claudeLog.info(
      { module: 'api', operation: 'validate-input' },
      '✅ Input validation',
      { theme, platform, style }
    )

    if (!theme) {
      claudeLog.warn(
        { module: 'api', operation: 'validation-error' },
        '❌ Theme is required'
      )
      return NextResponse.json(
        { error: 'Theme is required' },
        { status: 400 }
      )
    }

    claudeLog.info(
      { module: 'database', operation: 'create-session' },
      '🗄️ Creating new viral session'
    )

    // シンプルなセッション作成
    const session = await prisma.viralSession.create({
      data: {
        theme,
        platform,
        style,
        status: 'CREATED'
      }
    })

    claudeLog.logCreateFlow(session.id, 'CREATED', 'SUCCESS', {
      theme,
      platform,
      style
    })

    // 自動的に最初のステップ（Perplexity収集）を開始
    // TODO: 非同期処理の修正が必要
    // startPerplexityCollection(session.id).catch(console.error)

    const response = {
      id: session.id,
      status: 'COLLECTING',
      message: '情報収集を開始しました'
    }

    apiCall.end(startTime, 200, response)
    claudeLog.success(
      { module: 'api', operation: 'flow-start', sessionId: session.id },
      '🎉 Flow started successfully',
      Date.now() - startTime,
      response
    )

    return NextResponse.json(response)
  } catch (error) {
    apiCall.end(startTime, 500)
    claudeLog.error(
      { module: 'api', operation: 'flow-start' },
      '💥 Flow start failed',
      error
    )
    
    return NextResponse.json(
      { error: 'Failed to start flow' },
      { status: 500 }
    )
  }
}

// バックグラウンド処理（一時的に無効化）
/*
async function startPerplexityCollection(sessionId: string) {
  try {
    // 既存のPerplexity処理を呼び出し（内部処理）
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const response = await fetch(
      `${baseUrl}/api/generation/content/sessions/${sessionId}/collect`,
      { method: 'POST' }
    )
    
    if (!response.ok) {
      throw new Error('Perplexity collection failed')
    }
  } catch (error) {
    // エラーをセッションに記録
    await prisma.viralSession.update({
      where: { id: sessionId },
      data: {
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}
*/