import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  console.log('[API] POST /api/flow - Start')
  try {
    console.log('[API] Parsing request body...')
    const body = await request.json()
    console.log('[API] Body:', body)
    const { theme, platform = 'Twitter', style = 'エンターテイメント' } = body

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme is required' },
        { status: 400 }
      )
    }

    // シンプルなセッション作成
    const session = await prisma.viralSession.create({
      data: {
        theme,
        platform,
        style,
        status: 'CREATED'
      }
    })

    // 自動的に最初のステップ（Perplexity収集）を開始
    // TODO: 非同期処理の修正が必要
    // startPerplexityCollection(session.id).catch(console.error)

    return NextResponse.json({
      id: session.id,
      status: 'COLLECTING',
      message: '情報収集を開始しました'
    })
  } catch (error) {
    console.error('[API] Flow start error:', error)
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack')
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