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
    
    if (!sessionId || !taskId) {
      return NextResponse.json(
        { error: 'sessionId and taskId are required' },
        { status: 400 }
      )
    }
    
    console.log(`[CONTINUE ASYNC] Received: Session ${sessionId}, Task ${taskId}`)
    
    // タスク情報を簡易的に取得
    const task = await asyncProcessor.getTaskStatus(taskId)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // バックグラウンドで処理を開始（待たない）
    processTaskCompletion(sessionId, task).catch(console.error)
    
    // すぐにレスポンスを返す
    return NextResponse.json({
      success: true,
      message: 'Task completion processing started',
      sessionId,
      taskId
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

// バックグラウンドで実行される処理
async function processTaskCompletion(sessionId: string, task: any) {
  try {
    console.log('[CONTINUE ASYNC] Background processing:', {
      sessionId,
      taskType: task.type,
      taskStep: task.step_name,
      taskPhase: task.phase_number
    })
    
    // セッション取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: true
      }
    })
    
    if (!session) {
      console.error('[CONTINUE ASYNC] Session not found:', sessionId)
      return
    }
    
    // THINKタスクが完了した場合
    if (task.type === 'GPT_COMPLETION' && task.step_name === 'THINK' && session.currentStep === 'THINK') {
      await handleThinkCompletion(session, task)
    }
    // Perplexityタスクが完了した場合
    else if (task.type === 'PERPLEXITY_SEARCH' && task.step_name === 'EXECUTE' && session.currentStep === 'EXECUTE') {
      await handlePerplexityCompletion(session, task)
    }
    // INTEGRATEタスクが完了した場合
    else if (task.type === 'GPT_COMPLETION' && task.step_name === 'INTEGRATE' && session.currentStep === 'INTEGRATE') {
      await handleIntegrateCompletion(session, task)
    }
    
  } catch (error) {
    console.error('[CONTINUE ASYNC] Background error:', error)
  }
}

async function handleThinkCompletion(session: any, task: any) {
  const sessionId = session.id
  const response = await asyncProcessor.getTaskResponse(task.id)
  
  if (!response) {
    console.error('[CONTINUE ASYNC] No response for THINK task')
    return
  }
  
  // THINKの結果を保存
  let result
  try {
    let content = response.content
    
    // マークダウンコードブロックを削除
    if (typeof content === 'string' && content.includes('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '')
    }
    
    result = JSON.parse(content)
  } catch (e) {
    console.error('[CONTINUE ASYNC] Failed to parse THINK response:', e)
    console.error('[CONTINUE ASYNC] Raw content:', response.content?.substring(0, 200) + '...')
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
  
  console.log('[CONTINUE ASYNC] THINK completed, moved to EXECUTE')
  
  // 自動的にprocess-asyncを呼んで次のステップを実行
  setTimeout(async () => {
    try {
      console.log('[CONTINUE ASYNC] Auto-continue attempting to call process-async...')
      const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CONTINUE ASYNC] Failed to auto-continue:', errorText)
        console.error('[CONTINUE ASYNC] Response status:', response.status)
      } else {
        const result = await response.json()
        console.log('[CONTINUE ASYNC] Auto-continue success to EXECUTE step:', result)
      }
    } catch (e) {
      console.error('[CONTINUE ASYNC] Auto-continue error:', e)
      console.error('[CONTINUE ASYNC] Error details:', {
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 3).join('\n')
      })
    }
  }, 2000) // タイムアウトを2秒に延長
}

async function handlePerplexityCompletion(session: any, task: any) {
  const sessionId = session.id
  
  // 同じセッション・フェーズの全てのPerplexityタスクを取得
  const allTasks = await prisma.$queryRaw`
    SELECT * FROM api_tasks 
    WHERE session_id = ${sessionId}
    AND phase_number = ${task.phase_number}
    AND step_name = 'EXECUTE'
    AND type = 'PERPLEXITY_SEARCH'
  ` as any[]
  
  // 全てのタスクが完了したかチェック
  const allCompleted = allTasks.every(t => 
    t.status === 'COMPLETED' || 
    (t.status === 'FAILED' && t.retry_count >= 3)
  )
  
  if (!allCompleted) {
    const stats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      failed: allTasks.filter(t => t.status === 'FAILED' && t.retry_count >= 3).length,
      pending: allTasks.filter(t => t.status === 'QUEUED' || t.status === 'PROCESSING').length
    }
    console.log('[CONTINUE ASYNC] Waiting for all Perplexity tasks:', stats)
    return
  }
  
  // 全てのPerplexity結果を取得して統合
  const searchResults = []
  for (const t of allTasks) {
    const response = await asyncProcessor.getTaskResponse(t.id)
    if (response) {
      searchResults.push({
        taskId: t.id,
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
        taskIds: allTasks.map(t => t.id)
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
  
  console.log('[CONTINUE ASYNC] All Perplexity searches completed, moved to INTEGRATE')
  
  // 自動的にINTEGRATEステップを実行
  setTimeout(async () => {
    try {
      console.log('[CONTINUE ASYNC] Auto-continue attempting to call process-async for INTEGRATE...')
      const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[CONTINUE ASYNC] Failed to auto-continue to INTEGRATE:', errorText)
        console.error('[CONTINUE ASYNC] Response status:', response.status)
      } else {
        const result = await response.json()
        console.log('[CONTINUE ASYNC] Auto-continue success to INTEGRATE step:', result)
      }
    } catch (e) {
      console.error('[CONTINUE ASYNC] Auto-continue error:', e)
      console.error('[CONTINUE ASYNC] Error details:', {
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 3).join('\n')
      })
    }
  }, 2000) // タイムアウトを2秒に延長
}

async function handleIntegrateCompletion(session: any, task: any) {
  const sessionId = session.id
  const response = await asyncProcessor.getTaskResponse(task.id)
  
  if (!response) {
    console.error('[CONTINUE ASYNC] No response for INTEGRATE task')
    return
  }
  
  // INTEGRATEの結果を保存
  let result
  try {
    let content = response.content
    
    // マークダウンコードブロックを削除
    if (typeof content === 'string' && content.includes('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '')
    }
    
    result = JSON.parse(content)
  } catch (e) {
    console.error('[CONTINUE ASYNC] Failed to parse INTEGRATE response:', e)
    console.error('[CONTINUE ASYNC] Raw content:', response.content?.substring(0, 200) + '...')
    // JSONパースに失敗した場合は、エラーメッセージとして保存
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
    
    console.log(`[CONTINUE ASYNC] Phase ${session.currentPhase} completed, moved to Phase ${session.currentPhase + 1}`)
    
    // 自動的に次のフェーズのTHINKステップを実行
    setTimeout(async () => {
      try {
        console.log(`[CONTINUE ASYNC] Auto-continue attempting to start Phase ${session.currentPhase + 1}...`)
        const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process-async`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[CONTINUE ASYNC] Failed to auto-continue to next phase:', errorText)
          console.error('[CONTINUE ASYNC] Response status:', response.status)
        } else {
          const result = await response.json()
          console.log(`[CONTINUE ASYNC] Auto-continue success to Phase ${session.currentPhase + 1} THINK:`, result)
        }
      } catch (e) {
        console.error('[CONTINUE ASYNC] Auto-continue error:', e)
        console.error('[CONTINUE ASYNC] Error details:', {
          message: e.message,
          stack: e.stack?.split('\n').slice(0, 3).join('\n')
        })
      }
    }, 2000) // タイムアウトを2秒に延長
  } else {
    // 全フェーズ完了
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
    
    console.log('[CONTINUE ASYNC] All phases completed!')
    
    // 下書き作成処理
    try {
      const allPhases = await prisma.cotPhase.findMany({
        where: { sessionId },
        orderBy: { phaseNumber: 'asc' }
      })
      
      await createCompleteDrafts(sessionId, allPhases, session)
      console.log('[CONTINUE ASYNC] Drafts created successfully')
    } catch (error) {
      console.error('[CONTINUE ASYNC] Failed to create drafts:', error)
    }
  }
}

// 下書き作成関数
async function createCompleteDrafts(sessionId: string, phases: any[], session: any) {
  // Phase 2からコンセプト情報を取得（Phase 2とPhase 3がマージされたため）
  const phase2 = phases.find(p => p.phaseNumber === 2)
  const concepts = phase2?.integrateResult?.concepts || []
  
  // Phase 3から3つのコンテンツを取得
  const phase3 = phases.find(p => p.phaseNumber === 3)
  const contents = phase3?.integrateResult?.contents || []
  
  // Phase 4から戦略情報を取得
  const phase4 = phases.find(p => p.phaseNumber === 4)
  const strategy = phase4?.integrateResult || {}
  
  // 3つ全てのコンセプトで下書きを作成
  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i]
    const content = contents[i] || {}
    
    await prisma.cotDraft.create({
      data: {
        sessionId,
        conceptNumber: i + 1,
        title: concept.title || content.title,
        hook: concept.hook || concept.B,
        angle: concept.angle || concept.C,
        format: concept.format || concept.A,
        content: content.mainPost || null,
        // threadContent: content.threadPosts || null, // 一時的にコメントアウト
        visualGuide: content.visualDescription || concept.visual,
        timing: content.postingNotes || concept.timing || strategy.finalExecutionPlan?.bestTimeToPost?.[0] || '',
        hashtags: content.hashtags || concept.hashtags || [],
        newsSource: concept.newsSource || concept.opportunity,
        sourceUrl: concept.sourceUrl || null,
        kpis: strategy.successMetrics || strategy.kpis || null,
        riskAssessment: strategy.riskAssessment || strategy.riskMitigation || null,
        optimizationTips: strategy.optimizationTechniques || strategy.finalExecutionPlan?.followUpStrategy || null,
        status: 'DRAFT',
        viralScore: concept.viralPotential === '高' ? 90 : 
                   concept.viralPotential === '中' ? 70 : 
                   concept.viralPotential === '低' ? 50 : null
      }
    })
  }
  
  console.log(`[DRAFTS] Created ${concepts.length} drafts for session ${sessionId}`)
}