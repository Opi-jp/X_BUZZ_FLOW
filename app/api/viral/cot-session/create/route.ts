import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { expertise, style, platform } = body

    // 入力検証
    if (!expertise || !style || !platform) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    // 新しいChain of Thoughtセッションを作成
    const session = await prisma.cotSession.create({
      data: {
        sessionType: 'viral-content-creation',
        config: {
          expertise,
          style,
          platform,
          model: 'gpt-4o'
        },
        status: 'PENDING',
        currentPhase: 1,
        currentStep: 'THINK',
        phases: {
          phase1: { think: null, execute: null, integrate: null },
          phase2: { think: null, execute: null, integrate: null },
          phase3: { think: null, execute: null, integrate: null },
          phase4: { think: null, execute: null, integrate: null },
          phase5: { think: null, execute: null, integrate: null }
        },
        shouldCompleteBy: new Date(Date.now() + 10 * 60 * 1000) // 10分後
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      config: {
        expertise,
        style,
        platform
      },
      message: 'セッションが作成されました。処理を開始してください。',
      nextStep: {
        url: `/api/viral/cot-session/${session.id}/process`,
        method: 'POST',
        description: 'Chain of Thought処理を開始'
      }
    })

  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { 
        error: 'セッション作成に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}