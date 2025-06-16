import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sessionRetryManager } from '@/lib/session-retry-manager'

/**
 * セッションの再開API
 * 失敗または停止したセッションを再開する
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const params = await props.params
  const { sessionId } = params

  try {
    // セッションの存在確認
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phase: 'asc' }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 再開可能かチェック
    const canResume = await sessionRetryManager.canResumeSession(sessionId)
    if (!canResume) {
      return NextResponse.json(
        { 
          error: 'Session cannot be resumed',
          reason: session.status === 'COMPLETED' 
            ? 'Session is already completed' 
            : 'Session has exceeded maximum retry attempts'
        },
        { status: 400 }
      )
    }

    // 進捗状態を取得
    const progress = await sessionRetryManager.getSessionProgress(sessionId)

    // セッションを再開
    await sessionRetryManager.resumeSession(sessionId)

    // 非同期で処理を再開
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/viral/cot-session/${sessionId}/process-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeFromPhase: session.currentPhase,
        resumeFromStep: session.currentStep
      })
    }).catch(error => {
      console.error('[RESUME] Failed to trigger async processing:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Session resumption initiated',
      sessionId,
      currentStatus: session.status,
      progress: {
        completedPhases: progress.completedPhases,
        currentPhase: progress.currentPhase,
        currentStep: progress.currentStep,
        hasErrors: progress.hasErrors
      }
    })

  } catch (error) {
    console.error('[RESUME] Error:', error)
    return NextResponse.json(
      { error: 'Failed to resume session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}