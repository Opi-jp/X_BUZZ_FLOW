import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claudeLog } from '@/lib/core/claude-logger'
import { logApiError, logPrismaError } from '@/lib/api/error-logger'
import { DBManager, IDGenerator, EntityType, ErrorManager } from '@/lib/core/unified-system-manager'

export async function POST(request: Request) {
  console.error('=== CREATE FLOW START API CALLED ===')
  console.error('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL
  })
  console.error('Prisma import check:', { prisma, type: typeof prisma })
  
  // モジュール診断
  try {
    const libPrisma = await import('@/lib/prisma')
    console.error('Dynamic import result:', {
      keys: Object.keys(libPrisma),
      hasPrisma: 'prisma' in libPrisma,
      prismaType: typeof libPrisma.prisma
    })
  } catch (e) {
    console.error('Dynamic import error:', e)
  }
  
  const apiCall = claudeLog.logApiCall('POST', '/api/create/flow/start')
  const startTime = apiCall.start()
  
  let theme: string | undefined
  let platform: string = 'Twitter'
  let style: string = 'エンターテイメント'
  
  try {
    claudeLog.info(
      { module: 'api', operation: 'parse-body' },
      '📝 Parsing request body'
    )
    
    const body = await request.json()
    theme = body.theme
    platform = body.platform || 'Twitter'
    style = body.style || 'エンターテイメント'

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

    // 統一システム管理を使用してセッション作成
    const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)
    
    claudeLog.info(
      { module: 'database', operation: 'create-session-with-unified' },
      '🗄️ Creating session with unified system manager',
      { sessionId }
    )

    // DBManagerを使用してトランザクション内でセッション作成
    const session = await DBManager.transaction(async (tx) => {
      return await tx.viral_sessions.create({
        data: {
          id: sessionId,
          theme,
          platform,
          style,
          status: 'CREATED'
        }
      })
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
  } catch (error: any) {
    apiCall.end(startTime, 500)
    claudeLog.error(
      { module: 'api', operation: 'flow-start' },
      '💥 Flow start failed',
      error
    )
    
    // バックエンドエラーをログに記録
    logApiError({
      timestamp: new Date().toISOString(),
      method: request.method,
      url: '/api/create/flow/start',
      status: 500,
      error: error.message || 'Unknown error',
      stack: error.stack,
      body: await request.text().catch(() => 'Unable to read body')
    })
    
    // Prismaエラーの場合は詳細を記録
    if (error.code && error.code.startsWith('P')) {
      logPrismaError(error, 'viral_sessions.create')
    }
    
    // 統一システムのエラー管理にも記録
    await ErrorManager.logError(error, {
      module: 'flow',
      operation: 'flow-start',
      metadata: { theme, platform, style }
    })
    
    return NextResponse.json(
      { error: 'Failed to start flow', details: error.message },
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
    await prisma.viral_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}
*/