import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * セッションの進行状態を取得するAPI
 * UIで現在の状態を確認し、次のアクションを決定するために使用
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const params = await props.params
  const { sessionId } = params

  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phase: 'asc' }
        },
        drafts: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 完了したフェーズを特定
    const completedPhases = session.phases
      .filter(p => p.integrateResult !== null)
      .map(p => p.phase)

    // 各フェーズの詳細状態
    const phaseDetails = session.phases.map(phase => ({
      phase: phase.phase,
      hasThinkResult: !!phase.thinkResult,
      hasExecuteResult: !!phase.executeResult,
      hasIntegrateResult: !!phase.integrateResult,
      isComplete: !!phase.integrateResult
    }))

    // 現在のフェーズの詳細状態
    const currentPhaseDetail = phaseDetails.find(p => p.phase === session.currentPhase)

    // 次に進めるかどうかの判定
    const canProceedToNextPhase = currentPhaseDetail?.isComplete || false
    const requiresManualTrigger = session.currentStep === 'INTEGRATE' && currentPhaseDetail?.isComplete || false
    
    // エラーからの再開が可能か
    const canRetryFromError = session.status === 'FAILED' && session.retryCount < 3

    // 進行状況のサマリー
    const progressSummary = {
      totalPhases: 5,
      completedPhases: completedPhases.length,
      currentPhaseProgress: currentPhaseDetail ? 
        (currentPhaseDetail.hasThinkResult ? 1 : 0) + 
        (currentPhaseDetail.hasExecuteResult ? 1 : 0) + 
        (currentPhaseDetail.hasIntegrateResult ? 1 : 0) : 0,
      totalStepsInPhase: 3
    }

    // 推奨される次のアクション
    let recommendedAction = 'wait'
    if (session.status === 'FAILED') {
      recommendedAction = canRetryFromError ? 'retry' : 'review_error'
    } else if (session.status === 'COMPLETED') {
      recommendedAction = session.drafts.length > 0 ? 'review_drafts' : 'wait_for_drafts'
    } else if (requiresManualTrigger) {
      recommendedAction = 'proceed_to_next_phase'
    } else if (['THINKING', 'EXECUTING', 'INTEGRATING'].includes(session.status)) {
      recommendedAction = 'wait_for_completion'
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      completedPhases,
      phaseDetails,
      progressSummary,
      canProceedToNextPhase,
      requiresManualTrigger,
      canRetryFromError,
      recommendedAction,
      error: session.lastError,
      retryCount: session.retryCount,
      drafts: session.drafts,
      metadata: {
        expertise: session.expertise,
        style: session.style,
        platform: session.platform,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    })

  } catch (error) {
    console.error('[PROGRESS] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}