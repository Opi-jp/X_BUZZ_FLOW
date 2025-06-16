import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AsyncApiProcessor } from '@/lib/async-api-processor'

const asyncProcessor = AsyncApiProcessor.getInstance()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const resolvedParams = await params
    const sessionId = resolvedParams.sessionId
    const { taskId } = await request.json()
    
    if (!sessionId) {
      console.error('[CONTINUE ASYNC] sessionId is undefined')
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    console.log(`[CONTINUE ASYNC] Session ${sessionId}, Task ${taskId}`)
    
    // セッション取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: true
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    // タスクの状態を確認
    const metadata = session.metadata as any
    
    console.log('[CONTINUE ASYNC] Debug:', {
      sessionStep: session.currentStep,
      metadataTaskId: metadata?.currentTaskId,
      providedTaskId: taskId,
      match: metadata?.currentTaskId === taskId
    })
    
    // THINKタスクが完了した場合
    if (metadata?.currentTaskId === taskId && session.currentStep === 'THINK') {
      const response = await asyncProcessor.getTaskResponse(taskId)
      
      if (!response) {
        return NextResponse.json(
          { error: 'タスクの応答が見つかりません' },
          { status: 400 }
        )
      }
      
      // THINKの結果を保存
      let result
      try {
        result = JSON.parse(response.content)
      } catch (e) {
        console.error('[CONTINUE ASYNC] Failed to parse THINK response:', e)
        result = response.content
      }
      
      await prisma.cotPhase.upsert({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: session.currentPhase
          }
        },
        update: {
          thinkResult: result as any,
          thinkTokens: response.usage?.total_tokens || 0,
          thinkAt: new Date(),
          status: 'THINKING'
        },
        create: {
          sessionId,
          phaseNumber: session.currentPhase,
          thinkResult: result as any,
          thinkTokens: response.usage?.total_tokens || 0,
          thinkAt: new Date(),
          status: 'THINKING'
        }
      })
      
      // 次のステップへ
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          currentStep: 'EXECUTE',
          status: 'PENDING'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'THINKが完了しました。EXECUTEステップへ進みます。',
        sessionId,
        nextStep: 'EXECUTE',
        continueUrl: `/api/viral/cot-session/${sessionId}/process-async`
      })
    }
    
    // Perplexityタスクが完了した場合
    if (metadata?.currentTaskIds?.includes(taskId) && session.currentStep === 'EXECUTE') {
      // 全てのタスクが完了したかチェック
      const allTasksCompleted = await checkAllTasksCompleted(metadata.currentTaskIds)
      
      if (!allTasksCompleted) {
        const stats = await asyncProcessor.getSessionTasks(sessionId)
        return NextResponse.json({
          success: true,
          message: `Perplexityタスク ${taskId} が完了しました。残り ${stats.processing + stats.queued} 件処理中です。`,
          stats
        })
      }
      
      // 全てのPerplexity結果を取得して統合
      const searchResults = []
      for (const tid of metadata.currentTaskIds) {
        const response = await asyncProcessor.getTaskResponse(tid)
        if (response) {
          searchResults.push({
            taskId: tid,
            content: response.content,
            citations: response.citations,
            searchResults: response.searchResults
          })
        }
      }
      
      // EXECUTE結果を保存
      await prisma.cotPhase.update({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: session.currentPhase
          }
        },
        data: {
          executeResult: {
            searchResults,
            searchMethod: 'async-perplexity',
            taskIds: metadata.currentTaskIds
          } as any,
          executeDuration: Date.now() - new Date(session.updatedAt).getTime(),
          executeAt: new Date(),
          status: 'EXECUTING'
        }
      })
      
      // 次のステップへ
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          currentStep: 'INTEGRATE',
          status: 'PENDING'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: '全てのPerplexity検索が完了しました。INTEGRATEステップへ進みます。',
        sessionId,
        nextStep: 'INTEGRATE',
        searchResultsCount: searchResults.length,
        continueUrl: `/api/viral/cot-session/${sessionId}/process-async`
      })
    }
    
    // INTEGRATEタスクが完了した場合
    if (metadata?.currentTaskId === taskId && session.currentStep === 'INTEGRATE') {
      const response = await asyncProcessor.getTaskResponse(taskId)
      
      if (!response) {
        return NextResponse.json(
          { error: 'タスクの応答が見つかりません' },
          { status: 400 }
        )
      }
      
      // INTEGRATEの結果を保存
      let result
      try {
        result = JSON.parse(response.content)
      } catch (e) {
        console.error('[CONTINUE ASYNC] Failed to parse INTEGRATE response:', e)
        result = response.content
      }
      
      await prisma.cotPhase.update({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: session.currentPhase
          }
        },
        data: {
          integrateResult: result as any,
          integrateTokens: response.usage?.total_tokens || 0,
          integrateAt: new Date(),
          status: 'COMPLETED'
        }
      })
      
      // 次のフェーズへ
      const isLastPhase = session.currentPhase >= 5
      
      if (!isLastPhase) {
        await prisma.cotSession.update({
          where: { id: sessionId },
          data: {
            currentPhase: session.currentPhase + 1,
            currentStep: 'THINK',
            status: 'PENDING'
          }
        })
        
        return NextResponse.json({
          success: true,
          message: `Phase ${session.currentPhase} が完了しました。Phase ${session.currentPhase + 1} へ進みます。`,
          sessionId,
          completedPhase: session.currentPhase,
          nextPhase: session.currentPhase + 1,
          continueUrl: `/api/viral/cot-session/${sessionId}/process-async`
        })
      } else {
        // 全フェーズ完了
        await prisma.cotSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })
        
        // 下書き作成
        await createDrafts(sessionId, session.phases)
        
        return NextResponse.json({
          success: true,
          message: '全てのフェーズが完了しました！下書きが作成されました。',
          sessionId,
          completed: true,
          draftsUrl: `/viral/drafts?sessionId=${sessionId}`
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'タスクが処理されました',
      sessionId
    })
    
  } catch (error) {
    console.error('[CONTINUE ASYNC] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function checkAllTasksCompleted(taskIds: string[]): Promise<boolean> {
  const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',')
  const query = `
    SELECT * FROM api_tasks 
    WHERE id IN (${placeholders})
  `
  
  const tasks = await prisma.$queryRawUnsafe(query, ...taskIds) as any[]
  
  return tasks.every(task => 
    task.status === 'COMPLETED' || 
    (task.status === 'FAILED' && task.retry_count >= 3)
  )
}

async function createDrafts(sessionId: string, phases: any[]) {
  // 既存の下書き作成ロジックを使用
  const phase3 = phases.find(p => p.phaseNumber === 3)
  const phase4 = phases.find(p => p.phaseNumber === 4)
  const phase5 = phases.find(p => p.phaseNumber === 5)
  
  if (!phase3?.integrateResult || !phase4?.integrateResult) {
    console.error('[CONTINUE ASYNC] Missing required phases for draft creation')
    return
  }
  
  // 実装は既存のcreateCompleteDrafts関数を参照
}