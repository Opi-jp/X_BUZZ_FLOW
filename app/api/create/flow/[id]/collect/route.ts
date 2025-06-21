import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ErrorManager, DBManager } from '@/lib/core/unified-system-manager'
import { ClaudeLogger } from '@/lib/core/claude-logger'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    // セッションを取得
    const session = await prisma.viral_sessions.findUnique({
      where: { id }
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

    // ステータスを更新
    await DBManager.transaction(async (tx) => {
      await tx.viral_sessions.update({
        where: { id },
        data: {
          status: 'COLLECTING'
        }
      })
    })
    
    ClaudeLogger.flow(
      { module: 'flow', operation: 'collect-topics', sessionId: id },
      'Delegating to Intel module for topic collection',
      { theme: session.theme }
    )

    // Intel モジュールのトレンド収集APIを呼び出し
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const intelResponse = await fetch(`${baseUrl}/api/intel/trends/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: id,
        theme: session.theme,
        platform: session.platform || 'Twitter',
        style: session.style || 'エンターテイメント'
      })
    })

    if (!intelResponse.ok) {
      const errorData = await intelResponse.json()
      
      await DBManager.transaction(async (tx) => {
        await tx.viral_sessions.update({
          where: { id },
          data: { status: 'ERROR' }
        })
      })
      
      throw new Error(`Intel trends collect failed: ${errorData.error}`)
    }

    const intelData = await intelResponse.json()
    
    ClaudeLogger.success(
      { module: 'flow', operation: 'collect-topics', sessionId: id },
      'Topic collection completed via Intel module',
      0,
      { topicCount: intelData.topics?.topics?.length || 0 }
    )

    return NextResponse.json({
      success: true,
      sessionId: id,
      topics: intelData.topics,
      nextStep: 'concepts'
    })
  } catch (error: any) {
    ClaudeLogger.error(
      { module: 'flow', operation: 'collect-topics' },
      'Topic collection failed',
      error
    )
    
    await ErrorManager.logError(error, {
      module: 'flow',
      operation: 'flow-collect',
      metadata: { sessionId: (await params).id }
    })
    
    return NextResponse.json(
      { error: 'Failed to collect topics', details: error.message },
      { status: 500 }
    )
  }
}