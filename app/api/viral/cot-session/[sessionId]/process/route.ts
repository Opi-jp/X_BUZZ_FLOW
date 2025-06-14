import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { 
  Phase1Strategy, 
  Phase2Strategy, 
  Phase3Strategy,
  Phase4Strategy,
  Phase5Strategy,
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
  4: Phase4Strategy,
  5: Phase5Strategy
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
    
    console.log(`[SESSION PROCESS] Starting - Session: ${sessionId}, Phase: ${currentPhase}, Step: ${currentStep}, Status: ${session.status}`)
    
    // 処理中の場合はスキップ
    if (['THINKING', 'EXECUTING', 'INTEGRATING'].includes(session.status)) {
      console.log(`[SESSION PROCESS] Already processing, skipping...`)
      return NextResponse.json({
        success: true,
        message: '処理中です',
        sessionId,
        phase: currentPhase,
        step: currentStep,
        status: session.status
      })
    }
    
    // 処理開始前にステータスを更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: currentStep === 'THINK' ? 'THINKING' : 
                currentStep === 'EXECUTE' ? 'EXECUTING' : 'INTEGRATING',
        updatedAt: new Date()
      }
    })
    
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
      
      console.log(`[THINK] Sending request to OpenAI - Phase: ${currentPhase}`)
      console.log(`[THINK] Prompt length: ${prompt.length} characters`)
      
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
      
      console.log(`[THINK] Response received - Tokens used: ${completion.usage?.total_tokens}`)
      
      const rawContent = completion.choices[0].message.content || '{}'
      console.log(`[THINK] Raw response length: ${rawContent.length} characters`)
      
      try {
        result = JSON.parse(rawContent)
        console.log(`[THINK] JSON parsed successfully - Keys: ${Object.keys(result).join(', ')}`)
      } catch (parseError) {
        console.error(`[THINK] JSON parse error:`, parseError)
        console.error(`[THINK] Raw content sample:`, rawContent.substring(0, 500))
        throw new Error(`Failed to parse THINK response: ${parseError}`)
      }
      
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
      
      console.log(`[EXECUTE] Starting execution - Phase: ${currentPhase}`)
      console.log(`[EXECUTE] Think result keys: ${Object.keys(thinkResult).join(', ')}`)
      
      try {
        result = await strategy.execute.handler(thinkResult, context)
        console.log(`[EXECUTE] Execution completed successfully`)
        if (result.searchResults) {
          console.log(`[EXECUTE] Search results count: ${result.searchResults.length}`)
        }
      } catch (execError) {
        console.error(`[EXECUTE] Execution failed:`, execError)
        throw new Error(`Execute phase failed: ${execError}`)
      }
      
      // 結果を保存
      phases[`phase${currentPhase}`] = {
        ...phases[`phase${currentPhase}`],
        execute: {
          result,
          completedAt: new Date().toISOString()
        }
      }
      
      // Phase 1の検索結果をDBに保存（マイグレーション後に有効化）
      if (currentPhase === 1 && result.searchResultsForDB) {
        console.log(`[EXECUTE] Saving ${result.searchResultsForDB.length} search results to DB`)
        
        // TODO: マイグレーション後に以下のコメントを解除
        /*
        try {
          await prisma.searchResult.createMany({
            data: result.searchResultsForDB.map((sr: any) => ({
              sessionId,
              query: sr.query,
              title: sr.title,
              url: sr.url,
              snippet: sr.snippet,
              source: sr.source,
              position: sr.position
            }))
          })
          console.log(`[EXECUTE] Search results saved to DB`)
        } catch (dbError) {
          console.error(`[EXECUTE] Failed to save search results to DB:`, dbError)
          // DBエラーは無視して続行
        }
        */
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
      
      console.log(`[INTEGRATE] Sending request to OpenAI - Phase: ${currentPhase}`)
      console.log(`[INTEGRATE] Context keys: ${Object.keys(integrateContext).join(', ')}`)
      console.log(`[INTEGRATE] Prompt length: ${prompt.length} characters`)
      
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
      
      console.log(`[INTEGRATE] Response received - Tokens used: ${completion.usage?.total_tokens}`)
      
      const rawContent2 = completion.choices[0].message.content || '{}'
      console.log(`[INTEGRATE] Raw response length: ${rawContent2.length} characters`)
      
      try {
        result = JSON.parse(rawContent2)
        console.log(`[INTEGRATE] JSON parsed successfully - Keys: ${Object.keys(result).join(', ')}`)
      } catch (parseError) {
        console.error(`[INTEGRATE] JSON parse error:`, parseError)
        console.error(`[INTEGRATE] Raw content sample:`, rawContent2.substring(0, 500))
        throw new Error(`Failed to parse INTEGRATE response: ${parseError}`)
      }
      
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
      if (currentPhase < 5) {
        nextPhase = currentPhase + 1
        nextStep = 'THINK'
        
        // フェーズ完了時点で一旦停止（ユーザー確認待ち）
        await prisma.cotSession.update({
          where: { id: sessionId },
          data: {
            phases,
            currentPhase: nextPhase,
            currentStep: nextStep,
            status: 'PENDING', // 次のフェーズ開始前は PENDING に戻す
            totalDuration: session.totalDuration + (Date.now() - startTime),
            totalTokens: session.totalTokens + (result.tokens || 0),
            updatedAt: new Date()
          }
        })
        
        return NextResponse.json({
          success: true,
          sessionId,
          phase: currentPhase,
          step: currentStep,
          phaseCompleted: true,
          nextPhase,
          nextStep,
          message: result.nextStepMessage?.replace('「続行」と入力してください', '「次へ進む」ボタンをクリックしてください') || `Phase ${currentPhase} が完了しました。次のフェーズに進むには「次へ進む」ボタンをクリックしてください。`,
          result,
          duration: Date.now() - startTime,
          shouldContinue: false,
          nextAction: {
            message: `Phase ${currentPhase} が完了しました`,
            continueUrl: `/api/viral/cot-session/${sessionId}/process`,
            waitForUser: true
          }
        })
      } else {
        // 全フェーズ完了
        nextStep = 'INTEGRATE' // 変更なし
      }
    }
    
    const duration = Date.now() - startTime
    
    // セッション状態を更新
    const isCompleted = currentPhase === 5 && currentStep === 'INTEGRATE'
    
    // 次のステータスを決定
    let nextStatus = session.status
    if (isCompleted) {
      nextStatus = 'COMPLETED' as any
    } else if (nextStep === 'THINK') {
      nextStatus = 'THINKING' as any
    } else if (nextStep === 'EXECUTE') {
      nextStatus = 'EXECUTING' as any
    } else if (nextStep === 'INTEGRATE') {
      nextStatus = 'INTEGRATING' as any
    }
    
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        phases,
        currentPhase: nextPhase,
        currentStep: nextStep,
        status: nextStatus,
        totalDuration: session.totalDuration + duration,
        totalTokens: session.totalTokens + (result.tokens || 0),
        updatedAt: new Date(),
        ...(isCompleted && { completedAt: new Date() })
      }
    })
    
    // Phase 5が完了したら下書きを作成
    if (isCompleted) {
      await createCompleteDrafts(sessionId, phases, config)
    }
    
    return NextResponse.json({
      success: true,
      sessionId,
      phase: currentPhase,
      step: currentStep,
      nextPhase,
      nextStep,
      currentStatus: session.status,
      nextStatus,
      result,
      duration,
      isCompleted,
      shouldContinue: !isCompleted,
      nextAction: isCompleted ? {
        message: 'セッションが完了しました',
        draftsUrl: `/api/viral/cot-session/${sessionId}/drafts`
      } : {
        message: `Phase ${nextPhase} - ${nextStep} に進みます`,
        continueUrl: `/api/viral/cot-session/${sessionId}/process`,
        waitTime: 2000 // 2秒待機を推奨
      }
    })
    
  } catch (error) {
    console.error('[ERROR] Session processing failed:', error)
    if (error instanceof Error) {
      console.error('[ERROR] Error message:', error.message)
      console.error('[ERROR] Error stack:', error.stack)
    }
    
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
  // 全フェーズで統一：オリジナルプロンプトのPhase 0に準拠
  return 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
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
    return searchResults.map((r: any, i: number) => 
      `${i + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}\n   ソース: ${r.source}`
    ).join('\n\n')
  }
  return JSON.stringify(searchResults, null, 2)
}

function getPreviousPhaseResults(phases: any, currentPhase: number): any {
  const results: any = {}
  
  // Phase 1の結果を含める
  if (currentPhase > 1 && phases.phase1) {
    results.phase1Result = phases.phase1.integrate?.result
    // Phase 2用に、trendedTopicsを渡す
    results.trendedTopics = phases.phase1.integrate?.result?.trendedTopics || []
    // カテゴリ別の洞察も含める
    results.categoryInsights = phases.phase1.integrate?.result?.categoryInsights || {}
    // Perplexityで収集した詳細な分析データも含める
    results.searchResults = phases.phase1.execute?.result?.searchResults || []
  }
  
  // Phase 2の結果を含める
  if (currentPhase > 2 && phases.phase2?.integrate?.result) {
    results.phase2Result = phases.phase2.integrate.result
    results.selectedOpportunities = phases.phase2.integrate.result.selectedOpportunities || []
  }
  
  // Phase 3の結果を含める
  if (currentPhase > 3 && phases.phase3?.integrate?.result) {
    results.phase3Result = phases.phase3.integrate.result
    results.concepts = phases.phase3.integrate.result.concepts || []
  }
  
  // Phase 4の結果を含める
  if (currentPhase > 4 && phases.phase4?.integrate?.result) {
    results.phase4Result = phases.phase4.integrate.result
    results.mainPost = phases.phase4.integrate.result.mainPost || ''
  }
  
  return results
}

async function createCompleteDrafts(sessionId: string, phases: any, config: any) {
  // Phase 3からコンセプト情報を取得
  const concepts = phases.phase3?.integrate?.result?.concepts || []
  // Phase 4から選択されたコンセプトとコンテンツを取得
  const selectedIndex = phases.phase4?.think?.result?.selectedConceptIndex || 0
  const finalContent = phases.phase4?.integrate?.result || {}
  // Phase 5から戦略情報を取得
  const strategy = phases.phase5?.integrate?.result || {}
  
  // 選択されたコンセプトの下書きを作成
  const selectedConcept = concepts[selectedIndex]
  if (selectedConcept) {
    await prisma.cotDraft.create({
      data: {
        sessionId,
        conceptNumber: selectedIndex + 1,
        title: selectedConcept.title,
        hook: selectedConcept.hook,
        angle: selectedConcept.angle,
        structure: selectedConcept.structure,
        visual: selectedConcept.visual || finalContent.visualDescription,
        timing: selectedConcept.timing || strategy.bestTimeToPost?.[0],
        hashtags: finalContent.hashtags || selectedConcept.hashtags || [],
        opportunity: selectedConcept.opportunity,
        platform: selectedConcept.platform || config.platform,
        format: selectedConcept.format,
        expectedReaction: selectedConcept.expectedReaction,
        content: finalContent.mainPost,
        threadContent: finalContent.threadPosts || [],
        kpis: strategy.kpis || {},
        bestTimeToPost: strategy.bestTimeToPost || [],
        followUpStrategy: strategy.followUpStrategy || '',
        status: 'DRAFT'
      }
    })
  }
  
  // 他の未選択コンセプトも下書きとして保存（オプション）
  for (let i = 0; i < concepts.length; i++) {
    if (i !== selectedIndex) {
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
          status: 'ALTERNATIVE' // 代替案として保存
        }
      })
    }
  }
}