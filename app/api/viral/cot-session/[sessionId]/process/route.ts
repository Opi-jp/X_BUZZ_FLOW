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

// フェーズごとのストラテジーマッピング
const phaseStrategies = {
  1: Phase1Strategy,
  2: Phase2Strategy,
  3: Phase3Strategy,
  // 4: Phase4Strategy, // TODO: 実装
  // 5: Phase5Strategy  // TODO: 実装
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { sessionId } = await params
    
    // セッション取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }
    
    // 完了済みチェック
    if (session.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        message: 'セッションは既に完了しています',
        sessionId,
        drafts: await prisma.cotDraft.findMany({
          where: { sessionId }
        })
      })
    }
    
    // エラー状態チェック
    if (session.status === 'FAILED' && session.retryCount >= 3) {
      return NextResponse.json(
        { error: 'セッションは失敗しました。新しいセッションを作成してください。' },
        { status: 400 }
      )
    }
    
    const config = session.config as any
    const phases = session.phases as any || {}
    const currentPhase = session.currentPhase
    const currentStep = session.currentStep
    
    console.log(`Processing session ${sessionId}: Phase ${currentPhase}, Step ${currentStep}`)
    
    // Orchestratorの作成
    const orchestrator = new ChainOfThoughtOrchestrator(openai)
    
    // 現在のフェーズのストラテジーを取得
    const strategy = phaseStrategies[currentPhase as keyof typeof phaseStrategies]
    if (!strategy) {
      throw new Error(`Phase ${currentPhase} strategy not implemented`)
    }
    
    // コンテキストの準備
    const context = {
      expertise: config.expertise,
      style: config.style,
      platform: config.platform,
      ...getPreviousPhaseResults(phases, currentPhase)
    }
    
    let result
    let nextStep = currentStep
    let nextPhase = currentPhase
    
    // 現在のステップを実行
    if (currentStep === 'THINK') {
      // Think フェーズ
      const prompt = interpolatePrompt(strategy.think.prompt, context)
      
      const completion = await openai.chat.completions.create({
        model: config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: getSystemPrompt(currentPhase) },
          { role: 'user', content: prompt }
        ],
        temperature: strategy.think.temperature || 0.7,
        max_tokens: strategy.think.maxTokens,
        response_format: { type: 'json_object' }
      })
      
      result = JSON.parse(completion.choices[0].message.content || '{}')
      
      // 結果を保存
      phases[`phase${currentPhase}`] = {
        ...phases[`phase${currentPhase}`],
        think: {
          result,
          completedAt: new Date().toISOString(),
          tokens: completion.usage?.total_tokens || 0
        }
      }
      
      nextStep = 'EXECUTE'
      
    } else if (currentStep === 'EXECUTE') {
      // Execute フェーズ
      const thinkResult = phases[`phase${currentPhase}`]?.think?.result
      if (!thinkResult) {
        throw new Error('Think result not found')
      }
      
      result = await strategy.execute.handler(thinkResult)
      
      // 結果を保存
      phases[`phase${currentPhase}`] = {
        ...phases[`phase${currentPhase}`],
        execute: {
          result,
          completedAt: new Date().toISOString()
        }
      }
      
      nextStep = 'INTEGRATE'
      
    } else if (currentStep === 'INTEGRATE') {
      // Integrate フェーズ
      const executeResult = phases[`phase${currentPhase}`]?.execute?.result
      if (!executeResult) {
        throw new Error('Execute result not found')
      }
      
      const integrateContext = {
        ...context,
        ...phases[`phase${currentPhase}`]?.think?.result,
        ...executeResult
      }
      
      const prompt = interpolatePrompt(strategy.integrate.prompt, integrateContext)
      
      const completion = await openai.chat.completions.create({
        model: config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: getSystemPrompt(currentPhase) },
          { role: 'user', content: prompt }
        ],
        temperature: strategy.integrate.temperature || 0.5,
        max_tokens: strategy.integrate.maxTokens,
        response_format: { type: 'json_object' }
      })
      
      result = JSON.parse(completion.choices[0].message.content || '{}')
      
      // 結果を保存
      phases[`phase${currentPhase}`] = {
        ...phases[`phase${currentPhase}`],
        integrate: {
          result,
          completedAt: new Date().toISOString(),
          tokens: completion.usage?.total_tokens || 0
        }
      }
      
      // 次のフェーズへ
      if (currentPhase < 3) { // TODO: 5に変更
        nextPhase = currentPhase + 1
        nextStep = 'THINK'
      } else {
        // 全フェーズ完了
        nextStep = 'INTEGRATE' // 変更なし
      }
    }
    
    const duration = Date.now() - startTime
    
    // セッション状態を更新
    const isCompleted = currentPhase === 3 && currentStep === 'INTEGRATE' // TODO: 5に変更
    
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        phases,
        currentPhase: nextPhase,
        currentStep: nextStep,
        status: isCompleted ? 'COMPLETED' : session.status,
        totalDuration: session.totalDuration + duration,
        totalTokens: session.totalTokens + (result.tokens || 0),
        updatedAt: new Date(),
        ...(isCompleted && { completedAt: new Date() })
      }
    })
    
    // Phase 3が完了したら下書きを作成
    if (currentPhase === 3 && currentStep === 'INTEGRATE' && result.concepts) {
      await createDrafts(sessionId, result.concepts, config)
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      phase: currentPhase,
      step: currentStep,
      result,
      duration,
      isCompleted,
      nextAction: isCompleted ? {
        message: 'セッションが完了しました',
        draftsUrl: `/api/viral/cot-session/${sessionId}/drafts`
      } : {
        message: `Phase ${nextPhase} - ${nextStep} に進みます`,
        continueUrl: `/api/viral/cot-session/${sessionId}/process`
      }
    })
    
  } catch (error) {
    console.error('Session processing error:', error)
    
    // エラー時はリトライカウントを増やす
    if (params) {
      const { sessionId } = await params
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // 5分後
        }
      })
    }
    
    return NextResponse.json(
      { 
        error: 'セッション処理でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ヘルパー関数
function getSystemPrompt(phase: number): string {
  if (phase === 1) {
    return 'あなたは、優秀なリサーチアシスタントです。'
  } else if (phase === 2) {
    return 'あなたは、トレンド分析の専門家です。'
  } else if (phase === 3) {
    return 'あなたは、バズるコンテンツ戦略家です。'
  }
  return 'あなたは、コンテンツマーケティングの専門家です。'
}

function interpolatePrompt(template: string, context: any): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    if (key === 'searchResults' && context.searchResults) {
      return formatSearchResults(context.searchResults)
    }
    return context[key] || match
  })
}

function formatSearchResults(searchResults: any): string {
  if (Array.isArray(searchResults)) {
    return searchResults.map(sr => 
      `検索クエリ: "${sr.query}"\nカテゴリ: ${sr.category}\n結果:\n` +
      sr.results.map((r: any, i: number) => 
        `${i + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}`
      ).join('\n')
    ).join('\n\n---\n\n')
  }
  return JSON.stringify(searchResults, null, 2)
}

function getPreviousPhaseResults(phases: any, currentPhase: number): any {
  const results: any = {}
  
  // Phase 1の結果を含める
  if (currentPhase > 1 && phases.phase1?.integrate?.result) {
    results.phase1Result = phases.phase1.integrate.result
    results.opportunities = phases.phase1.integrate.result.viralPatterns?.topOpportunities || []
  }
  
  // Phase 2の結果を含める
  if (currentPhase > 2 && phases.phase2?.integrate?.result) {
    results.phase2Result = phases.phase2.integrate.result
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
        structure: concept.structure,
        visual: concept.visual,
        timing: concept.timing,
        hashtags: concept.hashtags,
        opportunity: concept.opportunity,
        platform: concept.platform || config.platform,
        format: concept.format,
        expectedReaction: concept.expectedReaction,
        status: 'DRAFT'
      }
    })
  }
}