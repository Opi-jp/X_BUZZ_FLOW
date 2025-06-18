import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 手動でフェーズを進めるAPI
 * フェーズ間の進行はユーザーが制御
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const params = await props.params
  const { sessionId } = params

  try {
    // セッションの状態を確認
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          where: { phaseNumber: { lte: 5 } },
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 現在のフェーズが完了しているか確認
    const currentPhaseData = session.phases.find(p => p.phaseNumber === session.currentPhase)
    
    // Phase 1は3ステップ完了が必要、Phase 2-4はthinkResultがあれば進める
    const isPhaseReady = session.currentPhase === 1 
      ? currentPhaseData?.integrateResult
      : currentPhaseData?.thinkResult
    
    if (!isPhaseReady) {
      return NextResponse.json(
        { 
          error: 'Current phase not completed',
          currentPhase: session.currentPhase,
          currentStep: session.currentStep,
          message: 'Please complete the current phase before proceeding'
        },
        { status: 400 }
      )
    }

    // 次のフェーズを計算
    const nextPhase = session.currentPhase + 1

    if (nextPhase > 5) {
      // Phase 5完了後の処理
      if (session.currentPhase === 5 && currentPhaseData.integrateResult) {
        // 下書き作成をトリガー
        await prisma.cotSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date()
          }
        })

        // 下書き作成のトリガー（非同期）
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/viral/cot-session/${sessionId}/create-drafts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(error => {
          console.error('[PROCEED] Failed to trigger draft creation:', error)
        })

        return NextResponse.json({
          success: true,
          message: 'All phases completed. Creating drafts...',
          sessionId,
          completedPhases: [1, 2, 3, 4, 5],
          status: 'COMPLETED'
        })
      }

      return NextResponse.json(
        { error: 'All phases already completed' },
        { status: 400 }
      )
    }

    // セッションを次のフェーズに更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentPhase: nextPhase,
        currentStep: 'THINK',
        status: 'THINKING',
        updatedAt: new Date()
      }
    })

    // 次のフェーズの処理を開始（非同期）
    const triggerResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/viral/cot-session/${sessionId}/process-async`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: nextPhase,
          step: 'THINK'
        })
      }
    )

    if (!triggerResponse.ok) {
      console.error('[PROCEED] Failed to trigger next phase:', triggerResponse.status)
      
      // ロールバック
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          currentPhase: session.currentPhase,
          currentStep: 'INTEGRATE',
          status: 'INTEGRATING'
        }
      })

      return NextResponse.json(
        { error: 'Failed to start next phase' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Proceeding to Phase ${nextPhase}`,
      sessionId,
      previousPhase: session.currentPhase,
      currentPhase: nextPhase,
      currentStep: 'THINK',
      completedPhases: session.phases
        .filter(p => p.integrateResult !== null)
        .map(p => p.phaseNumber)
    })

  } catch (error) {
    console.error('[PROCEED] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to proceed to next phase',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}