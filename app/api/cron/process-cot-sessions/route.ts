import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { 
  Phase1Strategy, 
  Phase2Strategy, 
  Phase3Strategy,
  ChainOfThoughtOrchestrator 
} from '@/lib/orchestrated-cot-strategy'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Cronジョブのセキュリティトークン
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Cronジョブの認証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const startTime = Date.now()
  
  try {
    // 処理待ちのセッションを取得
    const pendingSessions = await prisma.cotSession.findMany({
      where: {
        status: { 
          in: ['PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING'] 
        },
        OR: [
          { nextRetryAt: { lte: new Date() } },
          { nextRetryAt: null }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 5 // 同時実行数を制限
    })

    console.log(`Found ${pendingSessions.length} sessions to process`)

    // タイムアウトチェック（新しいスキーマではタイムアウト機能は簡略化）
    const timedOutSessions: any[] = [] // 一時的に無効化
    
    if (timedOutSessions.length > 0) {
      await prisma.cotSession.updateMany({
        where: {
          id: { in: timedOutSessions.map(s => s.id) }
        },
        data: {
          status: 'FAILED',
          lastError: 'Session timed out'
        }
      })
    }

    // アクティブなセッションを処理
    const activeSessions = pendingSessions.filter(
      session => !timedOutSessions.includes(session)
    )

    const results = await Promise.allSettled(
      activeSessions.map(session => processSession(session))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      duration: Date.now() - startTime,
      details: results.map((r, i) => ({
        sessionId: activeSessions[i].id,
        status: r.status,
        error: r.status === 'rejected' ? (r.reason?.message || 'Unknown error') : null
      }))
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// セッション処理ロジック（process/route.tsと共通化可能）
async function processSession(session: any): Promise<void> {
  const phaseStrategies = {
    1: Phase1Strategy,
    2: Phase2Strategy,
    3: Phase3Strategy,
  }

  try {
    await prisma.cotSession.update({
      where: { id: session.id },
      data: {
        status: getStatusForStep(session.currentStep)
      }
    })

    const config = session.config as any
    const phases = session.phases as any || {}
    const currentPhase = session.currentPhase
    const currentStep = session.currentStep

    // ストラテジー取得
    const strategy = phaseStrategies[currentPhase as keyof typeof phaseStrategies]
    if (!strategy) {
      throw new Error(`Phase ${currentPhase} not implemented`)
    }

    // コンテキスト準備
    const context = {
      expertise: config.expertise,
      style: config.style,
      platform: config.platform,
      ...getPreviousResults(phases, currentPhase)
    }

    let result: any
    let nextStep = currentStep
    let nextPhase = currentPhase

    // ステップ実行
    if (currentStep === 'THINK') {
      result = await executeThink(strategy, context, config)
      phases[`phase${currentPhase}`] = {
        ...phases[`phase${currentPhase}`],
        think: {
          result,
          completedAt: new Date().toISOString()
        }
      }
      nextStep = 'EXECUTE'
      
    } else if (currentStep === 'EXECUTE') {
      const thinkResult = phases[`phase${currentPhase}`]?.think?.result
      result = await strategy.execute.handler(thinkResult)
      phases[`phase${currentPhase}`] = {
        ...phases[`phase${currentPhase}`],
        execute: {
          result,
          completedAt: new Date().toISOString()
        }
      }
      nextStep = 'INTEGRATE'
      
    } else if (currentStep === 'INTEGRATE') {
      const executeResult = phases[`phase${currentPhase}`]?.execute?.result
      result = await executeIntegrate(strategy, { ...context, ...executeResult }, config)
      phases[`phase${currentPhase}`] = {
        ...phases[`phase${currentPhase}`],
        integrate: {
          result,
          completedAt: new Date().toISOString()
        }
      }
      
      if (currentPhase < 3) {
        nextPhase = currentPhase + 1
        nextStep = 'THINK'
      }
    }

    const isCompleted = currentPhase === 3 && currentStep === 'INTEGRATE'

    // 状態更新
    await prisma.cotSession.update({
      where: { id: session.id },
      data: {
        phases,
        currentPhase: nextPhase,
        currentStep: nextStep,
        status: isCompleted ? 'COMPLETED' : 'PENDING',
        retryCount: 0, // 成功したらリセット
        lastError: null,
        ...(isCompleted && { completedAt: new Date() })
      }
    })

    // Phase 3完了時は下書き作成
    if (currentPhase === 3 && currentStep === 'INTEGRATE' && result.concepts) {
      await createDrafts(session.id, result.concepts, config)
    }

  } catch (error) {
    console.error(`Session ${session.id} processing error:`, error)
    
    // エラー処理
    await prisma.cotSession.update({
      where: { id: session.id },
      data: {
        status: 'FAILED',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        retryCount: session.retryCount + 1,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // 5分後にリトライ
      }
    })
    
    throw error
  }
}

// ヘルパー関数
function getStatusForStep(step: string): 'THINKING' | 'EXECUTING' | 'INTEGRATING' | 'PENDING' {
  switch (step) {
    case 'THINK': return 'THINKING'
    case 'EXECUTE': return 'EXECUTING'
    case 'INTEGRATE': return 'INTEGRATING'
    default: return 'PENDING'
  }
}

async function executeThink(strategy: any, context: any, config: any) {
  const prompt = interpolatePrompt(strategy.think.prompt, context)
  
  const completion = await openai.chat.completions.create({
    model: config.model || 'gpt-4o',
    messages: [
      { role: 'system', content: 'あなたは優秀なアシスタントです。' },
      { role: 'user', content: prompt }
    ],
    temperature: strategy.think.temperature || 0.7,
    max_tokens: strategy.think.maxTokens,
    response_format: { type: 'json_object' }
  })
  
  return JSON.parse(completion.choices[0].message.content || '{}')
}

async function executeIntegrate(strategy: any, context: any, config: any) {
  const prompt = interpolatePrompt(strategy.integrate.prompt, context)
  
  const completion = await openai.chat.completions.create({
    model: config.model || 'gpt-4o',
    messages: [
      { role: 'system', content: 'あなたはコンテンツ戦略の専門家です。' },
      { role: 'user', content: prompt }
    ],
    temperature: strategy.integrate.temperature || 0.5,
    max_tokens: strategy.integrate.maxTokens,
    response_format: { type: 'json_object' }
  })
  
  return JSON.parse(completion.choices[0].message.content || '{}')
}

function interpolatePrompt(template: string, context: any): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return JSON.stringify(context[key]) || match
  })
}

function getPreviousResults(phases: any, currentPhase: number): any {
  const results: any = {}
  
  if (currentPhase > 1 && phases.phase1?.integrate?.result) {
    results.opportunities = phases.phase1.integrate.result.viralPatterns?.topOpportunities || []
  }
  
  if (currentPhase > 2 && phases.phase2?.integrate?.result) {
    results.selectedOpportunities = phases.phase2.integrate.result.selectedOpportunities || []
  }
  
  return results
}

async function createDrafts(sessionId: string, concepts: any[], config: any) {
  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i]
    await prisma.cotDraft.create({
      data: {
        sessionId,
        conceptNumber: i + 1,
        title: concept.title,
        hook: concept.hook,
        angle: concept.angle,
        format: concept.format || 'single',
        visualGuide: concept.visual,
        timing: concept.timing,
        hashtags: concept.hashtags,
        // opportunity: concept.opportunity, // 新スキーマでは不要
        // platform: concept.platform || config.platform, // セッションレベルで管理
        // format: concept.format, // 重複削除
        // expectedReaction: concept.expectedReaction // 新スキーマでは不要,
        status: 'DRAFT'
      }
    })
  }
}