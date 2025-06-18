import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AsyncApiProcessor } from '@/lib/async-api-processor'

const asyncProcessor = AsyncApiProcessor.getInstance()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const resolvedParams = await params
    const sessionId = resolvedParams.sessionId
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    // セッション情報を取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    // 非同期タスクの状態を取得
    const taskStats = await asyncProcessor.getSessionTasks(sessionId)
    
    // 現在のタスクの詳細を取得
    const metadata = session.metadata as any
    let currentTasks = []
    
    if (metadata?.currentTaskId) {
      const task = await asyncProcessor.getTaskStatus(metadata.currentTaskId)
      if (task) currentTasks.push(task)
    }
    
    if (metadata?.currentTaskIds) {
      for (const taskId of metadata.currentTaskIds) {
        const task = await asyncProcessor.getTaskStatus(taskId)
        if (task) currentTasks.push(task)
      }
    }
    
    // レスポンスを構築
    const response = {
      session: {
        id: session.id,
        status: session.status,
        currentPhase: session.currentPhase,
        currentStep: session.currentStep,
        expertise: session.expertise,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      },
      phases: session.phases.map(phase => ({
        number: phase.phaseNumber,
        status: phase.status,
        hasThink: !!phase.thinkResult,
        hasExecute: !!phase.executeResult,
        hasIntegrate: !!phase.integrateResult,
        timestamps: {
          think: phase.thinkAt,
          execute: phase.executeAt,
          integrate: phase.integrateAt
        }
      })),
      asyncTasks: {
        summary: {
          total: taskStats.total,
          queued: taskStats.queued,
          processing: taskStats.processing,
          completed: taskStats.completed,
          failed: taskStats.failed
        },
        current: currentTasks.map(task => ({
          id: task.id,
          type: task.type,
          status: task.status,
          phase: task.phaseNumber,
          step: task.stepName,
          createdAt: task.createdAt,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          duration: task.completedAt && task.startedAt 
            ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
            : null,
          error: task.error
        })),
        recent: taskStats.tasks.slice(0, 5).map(task => ({
          id: task.id,
          type: task.type,
          status: task.status,
          phase: task.phaseNumber,
          step: task.stepName,
          createdAt: task.createdAt
        }))
      },
      progress: {
        completedPhases: session.phases.filter(p => p.status === 'COMPLETED').length,
        totalPhases: 5,
        percentage: Math.round((session.phases.filter(p => p.status === 'COMPLETED').length / 5) * 100),
        estimatedTimeRemaining: estimateTimeRemaining(session, taskStats)
      },
      nextAction: getNextAction(session, taskStats)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[ASYNC STATUS] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function estimateTimeRemaining(session: any, taskStats: any): string {
  // 簡単な推定ロジック
  const remainingPhases = 5 - session.phases.filter((p: any) => p.status === 'COMPLETED').length
  const avgTimePerPhase = 60000 // 1分と仮定
  const remainingTasks = taskStats.queued + taskStats.processing
  const avgTimePerTask = 30000 // 30秒と仮定
  
  const totalMs = (remainingPhases * avgTimePerPhase) + (remainingTasks * avgTimePerTask)
  
  if (totalMs < 60000) {
    return `約${Math.round(totalMs / 1000)}秒`
  } else {
    return `約${Math.round(totalMs / 60000)}分`
  }
}

function getNextAction(session: any, taskStats: any): any {
  if (session.status === 'COMPLETED') {
    return {
      action: 'view_drafts',
      message: '処理が完了しました。下書きを確認してください。',
      url: `/viral/drafts?sessionId=${session.id}`
    }
  }
  
  if (session.status === 'FAILED') {
    return {
      action: 'recover',
      message: 'エラーが発生しました。リカバリーオプションを確認してください。',
      url: `/api/viral/cot-session/${session.id}/recover`
    }
  }
  
  if (session.status === 'EXECUTING') {
    if (taskStats.processing > 0) {
      return {
        action: 'wait',
        message: `${taskStats.processing}件のタスクを処理中です...`,
        refreshAfter: 5000
      }
    } else if (taskStats.queued > 0) {
      return {
        action: 'wait', 
        message: `${taskStats.queued}件のタスクがキューで待機中です...`,
        refreshAfter: 10000
      }
    }
  }
  
  return {
    action: 'continue',
    message: '次のステップを実行できます',
    url: `/api/viral/cot-session/${session.id}/process-async`
  }
}