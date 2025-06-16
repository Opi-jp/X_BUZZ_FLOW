import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AsyncApiProcessor } from '@/lib/async-api-processor'
import { 
  Phase1Strategy, 
  Phase2Strategy, 
  Phase3Strategy,
  Phase4Strategy,
  Phase5Strategy
} from '@/lib/orchestrated-cot-strategy'

const asyncProcessor = AsyncApiProcessor.getInstance()

// フェーズごとのストラテジーマッピング
const phaseStrategies = {
  1: Phase1Strategy,
  2: Phase2Strategy,
  3: Phase3Strategy,
  4: Phase4Strategy,
  5: Phase5Strategy
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const resolvedParams = await params
    const sessionId = resolvedParams.sessionId
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
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
    
    const currentPhase = session.currentPhase
    const currentStep = session.currentStep
    
    console.log(`[ASYNC PROCESS] Starting - Session: ${sessionId}, Phase: ${currentPhase}, Step: ${currentStep}`)
    
    // 現在のフェーズのストラテジーを取得
    const strategy = phaseStrategies[currentPhase as keyof typeof phaseStrategies]
    if (!strategy) {
      throw new Error(`Phase ${currentPhase} strategy not implemented`)
    }
    
    // コンテキストの構築
    const context = await buildContext(session, currentPhase)
    
    let taskId: string | null = null
    
    // 現在のステップを処理
    if (currentStep === 'THINK') {
      // THINKステップ: GPT APIを非同期で実行
      const prompt = interpolatePrompt(strategy.think.prompt, context)
      
      taskId = await asyncProcessor.queueTask(
        'GPT_COMPLETION',
        sessionId,
        currentPhase,
        'THINK',
        {
          messages: [
            { role: 'system', content: getSystemPrompt(currentPhase) },
            { role: 'user', content: prompt }
          ],
          temperature: strategy.think.temperature || 0.7,
          maxTokens: strategy.think.maxTokens,
          responseFormat: { type: 'json_object' }
        }
      )
      
      // ステータスを更新（生SQLを使用）
      // タスクIDは直接タスクレコードからsession_idで引ける
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'EXECUTING',
          updatedAt: new Date()
        }
      })
      
    } else if (currentStep === 'EXECUTE') {
      // EXECUTEステップ: Phase 1の場合はPerplexity、それ以外はスキップ
      if (currentPhase === 1) {
        // Phase 1の場合、複数のPerplexity検索をキュー
        const phase = session.phases.find(p => p.phaseNumber === 1)
        const thinkResult = phase?.thinkResult as any
        
        if (thinkResult?.perplexityQuestions) {
          const taskIds = await asyncProcessor.queueBatch(
            thinkResult.perplexityQuestions.map((q: any) => ({
              type: 'PERPLEXITY_SEARCH' as const,
              sessionId,
              phaseNumber: 1,
              stepName: 'EXECUTE',
              request: {
                query: q.question,
                systemPrompt: '質問の意図を理解し、適切な情報を提供してください。必ずURLと日付を含めてください。'
              }
            }))
          )
          
          // タスクIDは直接タスクレコードから取得可能
          await prisma.cotSession.update({
            where: { id: sessionId },
            data: {
              status: 'EXECUTING',
              updatedAt: new Date()
            }
          })
          
          return NextResponse.json({
            success: true,
            message: `${taskIds.length}件のPerplexity検索をキューに追加しました`,
            sessionId,
            phase: currentPhase,
            step: currentStep,
            taskIds,
            status: 'WAITING_API'
          })
        }
      }
      
      // Phase 2以降はEXECUTEをスキップしてINTEGRATEへ
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          currentStep: 'INTEGRATE',
          status: 'PENDING'
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'EXECUTEステップをスキップしてINTEGRATEへ進みます',
        sessionId,
        phase: currentPhase,
        step: 'INTEGRATE',
        shouldContinue: true
      })
      
    } else if (currentStep === 'INTEGRATE') {
      // INTEGRATEステップ: GPT APIを非同期で実行
      const phase = session.phases.find(p => p.phaseNumber === currentPhase)
      
      if (!phase?.executeResult && currentPhase === 1) {
        // Phase 1でexecuteResultがない場合は待機
        return NextResponse.json({
          success: false,
          error: 'Execute結果がまだ準備できていません',
          sessionId,
          phase: currentPhase,
          step: currentStep
        }, { status: 400 })
      }
      
      const integrateContext = {
        ...context,
        ...(phase?.thinkResult as any || {}),
        ...(phase?.executeResult as any || {})
      }
      
      const prompt = interpolatePrompt(strategy.integrate.prompt, integrateContext)
      
      taskId = await asyncProcessor.queueTask(
        'GPT_COMPLETION',
        sessionId,
        currentPhase,
        'INTEGRATE',
        {
          messages: [
            { role: 'system', content: getSystemPrompt(currentPhase) },
            { role: 'user', content: prompt }
          ],
          temperature: strategy.integrate.temperature || 0.5,
          maxTokens: strategy.integrate.maxTokens,
          responseFormat: { type: 'json_object' }
        }
      )
      
      // タスクIDは直接タスクレコードから取得可能
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'EXECUTING',
          updatedAt: new Date()
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      phase: currentPhase,
      step: currentStep,
      taskId,
      status: 'WAITING_API',
      message: 'タスクをキューに追加しました。完了時に自動的に次のステップへ進みます。',
      checkStatusUrl: `/api/viral/cot-session/${sessionId}/status`
    })
    
  } catch (error) {
    console.error('[ASYNC PROCESS] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ヘルパー関数
function getSystemPrompt(phase: number): string {
  return 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
}

function interpolatePrompt(template: string, context: any): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    const value = context[key]
    if (value && typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return value || match
  })
}

async function buildContext(session: any, currentPhase: number): Promise<any> {
  const baseContext = {
    expertise: session.expertise || 'AIと働き方',
    style: session.style || '洞察的',
    platform: session.platform || 'Twitter',
  }
  
  const userConfig = {
    expertise: baseContext.expertise,
    style: baseContext.style,
    platform: baseContext.platform
  }
  
  // 前のフェーズの結果を含める
  const previousResults: any = {}
  if (currentPhase > 1) {
    for (let i = 1; i < currentPhase; i++) {
      const phase = session.phases.find((p: any) => p.phaseNumber === i)
      if (phase?.integrateResult) {
        previousResults[`phase${i}Result`] = phase.integrateResult
      }
    }
  }
  
  return {
    ...baseContext,
    userConfig,
    ...previousResults
  }
}