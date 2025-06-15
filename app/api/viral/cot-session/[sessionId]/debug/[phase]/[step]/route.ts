import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { 
  Phase1Strategy, 
  Phase2Strategy, 
  Phase3Strategy,
  Phase4Strategy
} from '@/lib/orchestrated-cot-strategy'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const phaseStrategies = {
  1: Phase1Strategy,
  2: Phase2Strategy,
  3: Phase3Strategy,
  4: Phase4Strategy
}

// デバッグ専用API - 特定のフェーズ・ステップのみを実行
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string, phase: string, step: string }> }
) {
  try {
    const { sessionId, phase, step } = await params
    const phaseNumber = parseInt(phase)
    const body = await request.json()
    const { mockData, saveToDb = true, dryRun = false, skipPerplexity = true } = body
    
    console.log(`[DEBUG API] Session: ${sessionId}, Phase: ${phaseNumber}, Step: ${step}`)
    console.log(`[DEBUG API] Options:`, { saveToDb, dryRun, skipPerplexity, hasMockData: !!mockData })
    
    // セッション取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          where: { phaseNumber },
          take: 1
        }
      }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    const strategy = phaseStrategies[phaseNumber as keyof typeof phaseStrategies]
    if (!strategy) {
      return NextResponse.json(
        { error: `Phase ${phaseNumber} の戦略が見つかりません` },
        { status: 400 }
      )
    }
    
    // コンテキスト構築
    const context = await buildDebugContext(session, phaseNumber, mockData)
    
    let result: any = {}
    const startTime = Date.now()
    
    if (step === 'THINK') {
      // THINKステップの実行
      const prompt = interpolatePrompt(strategy.think.prompt, context)
      
      if (dryRun) {
        result = {
          prompt,
          promptLength: prompt.length,
          context: Object.keys(context),
          dryRun: true
        }
      } else {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: strategy.think.temperature || 0.7,
          max_tokens: strategy.think.maxTokens,
          response_format: { type: 'json_object' }
        })
        
        result = {
          output: JSON.parse(completion.choices[0].message.content || '{}'),
          tokens: completion.usage?.total_tokens || 0,
          duration: Date.now() - startTime
        }
        
        if (saveToDb && !dryRun) {
          await saveThinkResult(sessionId, phaseNumber, prompt, result.output, result.tokens)
        }
      }
      
    } else if (step === 'EXECUTE') {
      // EXECUTEステップの実行
      const currentPhase = session.phases[0]
      const thinkResult = mockData?.thinkResult || currentPhase?.thinkResult
      
      if (!thinkResult) {
        return NextResponse.json(
          { error: 'THINKの結果が見つかりません' },
          { status: 400 }
        )
      }
      
      if (dryRun) {
        result = {
          thinkResult: Object.keys(thinkResult),
          context: Object.keys(context),
          skipPerplexity,
          dryRun: true
        }
      } else {
        // skipPerplexityがtrueの場合、モックデータを返す
        if (skipPerplexity && phaseNumber === 1) {
          result = {
            output: {
              searchResults: mockData?.searchResults || [
                {
                  question: "デバッグ用モック質問",
                  category: "A",
                  analysis: "デバッグモードのため、実際の検索は実行されませんでした。",
                  sources: []
                }
              ],
              totalResults: 1,
              searchMethod: 'debug_mock',
              searchDate: new Date().toISOString()
            },
            duration: Date.now() - startTime,
            skippedPerplexity: true
          }
        } else {
          const executeResult = await strategy.execute.handler(thinkResult, context)
          result = {
            output: executeResult,
            duration: Date.now() - startTime
          }
        }
        
        if (saveToDb && !dryRun) {
          await saveExecuteResult(sessionId, phaseNumber, result.output, result.duration)
        }
      }
      
    } else if (step === 'INTEGRATE') {
      // INTEGRATEステップの実行
      const currentPhase = session.phases[0]
      const executeResult = mockData?.executeResult || currentPhase?.executeResult
      
      if (!executeResult) {
        return NextResponse.json(
          { error: 'EXECUTEの結果が見つかりません' },
          { status: 400 }
        )
      }
      
      const integrateContext = {
        ...context,
        ...(currentPhase?.thinkResult as any || {}),
        ...executeResult
      }
      
      const prompt = interpolatePrompt(strategy.integrate.prompt, integrateContext)
      
      if (dryRun) {
        result = {
          prompt,
          promptLength: prompt.length,
          contextKeys: Object.keys(integrateContext),
          dryRun: true
        }
      } else {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: strategy.integrate.temperature || 0.5,
          max_tokens: strategy.integrate.maxTokens,
          response_format: { type: 'json_object' }
        })
        
        result = {
          output: JSON.parse(completion.choices[0].message.content || '{}'),
          tokens: completion.usage?.total_tokens || 0,
          duration: Date.now() - startTime
        }
        
        if (saveToDb && !dryRun) {
          await saveIntegrateResult(sessionId, phaseNumber, prompt, result.output, result.tokens)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      phase: phaseNumber,
      step,
      result,
      debug: {
        mockDataUsed: !!mockData,
        savedToDb: saveToDb && !dryRun,
        dryRun,
        skipPerplexity
      }
    })
    
  } catch (error) {
    console.error('[DEBUG API] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'デバッグ実行中にエラーが発生しました',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// デバッグ用のコンテキスト構築
async function buildDebugContext(session: any, targetPhase: number, mockData?: any) {
  const baseContext = {
    expertise: session.expertise,
    style: session.style,
    platform: session.platform,
    userConfig: {
      expertise: session.expertise,
      style: session.style,
      platform: session.platform
    }
  }
  
  // モックデータがある場合は優先
  if (mockData?.context) {
    return { ...baseContext, ...mockData.context }
  }
  
  // 前のフェーズの結果を含める
  const context = { ...baseContext }
  
  const phases = await prisma.cotPhase.findMany({
    where: {
      sessionId: session.id,
      phaseNumber: { lt: targetPhase }
    },
    orderBy: { phaseNumber: 'asc' }
  })
  
  phases.forEach(phase => {
    if (phase.integrateResult) {
      // Phase 1の結果
      if (phase.phaseNumber === 1) {
        context.trendedTopics = (phase.integrateResult as any).trendedTopics || []
        // Phase 2のプロンプトは{opportunities}を期待しているので、trendedTopicsをopportunitiesとしても渡す
        context.opportunities = (phase.integrateResult as any).trendedTopics || []
        context.searchResults = (phase.executeResult as any)?.searchResults || []
      }
      // Phase 2の結果
      else if (phase.phaseNumber === 2) {
        context.concepts = (phase.integrateResult as any).concepts || []
        context.opportunityCount = (phase.integrateResult as any).opportunityCount || 0
      }
      // Phase 3の結果
      else if (phase.phaseNumber === 3) {
        context.concepts = (phase.integrateResult as any).concepts || []
      }
      // Phase 4の結果
      else if (phase.phaseNumber === 4) {
        context.contents = (phase.integrateResult as any).contents || []
      }
    }
  })
  
  return context
}

// プロンプト補間
function interpolatePrompt(template: string, context: any): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    const value = context[key]
    if (value === undefined) {
      return match
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return value.toString()
  })
}

// DB保存関数
async function saveThinkResult(sessionId: string, phaseNumber: number, prompt: string, result: any, tokens: number) {
  await prisma.cotPhase.upsert({
    where: {
      sessionId_phaseNumber: {
        sessionId,
        phaseNumber
      }
    },
    update: {
      thinkPrompt: prompt,
      thinkResult: result,
      thinkTokens: tokens,
      thinkAt: new Date(),
      status: 'THINKING'
    },
    create: {
      sessionId,
      phaseNumber,
      thinkPrompt: prompt,
      thinkResult: result,
      thinkTokens: tokens,
      thinkAt: new Date(),
      status: 'THINKING'
    }
  })
}

async function saveExecuteResult(sessionId: string, phaseNumber: number, result: any, duration: number) {
  await prisma.cotPhase.update({
    where: {
      sessionId_phaseNumber: {
        sessionId,
        phaseNumber
      }
    },
    data: {
      executeResult: result,
      executeDuration: duration,
      executeAt: new Date(),
      status: 'EXECUTING'
    }
  })
}

async function saveIntegrateResult(sessionId: string, phaseNumber: number, prompt: string, result: any, tokens: number) {
  await prisma.cotPhase.update({
    where: {
      sessionId_phaseNumber: {
        sessionId,
        phaseNumber
      }
    },
    data: {
      integratePrompt: prompt,
      integrateResult: result,
      integrateTokens: tokens,
      integrateAt: new Date(),
      status: 'COMPLETED'
    }
  })
  
  // セッションの状態も更新
  const isLastPhase = phaseNumber === 4
  if (isLastPhase) {
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
  }
}