import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { 
  Phase1Strategy, 
  Phase2Strategy, 
  Phase3Strategy,
  Phase4Strategy,
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
  4: Phase4Strategy
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
    
    // エラー状態と再試行制限チェック
    if (session.status === 'FAILED') {
      // 再試行回数制限チェック
      if (session.retryCount >= 5) {
        return NextResponse.json(
          { 
            error: 'セッションは最大再試行回数に達しました。新しいセッションを作成してください。',
            retryCount: session.retryCount,
            lastError: session.lastError
          },
          { status: 400 }
        )
      }
      
      // 再試行可能時間チェック
      if (session.nextRetryAt && new Date() < session.nextRetryAt) {
        const waitTime = Math.ceil((session.nextRetryAt.getTime() - Date.now()) / 1000)
        return NextResponse.json(
          { 
            error: `再試行まで ${waitTime} 秒お待ちください`,
            waitTime,
            nextRetryAt: session.nextRetryAt
          },
          { status: 429 }
        )
      }
      
      console.log(`[SESSION RECOVERY] Retrying failed session (attempt ${session.retryCount + 1}/5)`)
    }
    
    const currentPhase = session.currentPhase
    const currentStep = session.currentStep
    
    console.log(`[SESSION PROCESS] Starting - Session: ${sessionId}, Phase: ${currentPhase}, Step: ${currentStep}, Status: ${session.status}`)
    
    // セッション状態の自動復旧処理
    const sessionRecovery = await handleSessionRecovery(session)
    if (sessionRecovery.shouldSkip) {
      return NextResponse.json(sessionRecovery.response)
    }
    
    // 復旧処理によってセッションが更新された場合、最新状態を取得
    if (sessionRecovery.updated) {
      const updatedSession = await prisma.cotSession.findUnique({
        where: { id: sessionId },
        include: { phases: true }
      })
      if (updatedSession) {
        Object.assign(session, updatedSession)
      }
    }
    
    // 処理開始前にステータスを更新
    const processingStatus = currentStep === 'THINK' ? 'THINKING' : 
                           currentStep === 'EXECUTE' ? 'EXECUTING' : 'INTEGRATING'
    
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: processingStatus,
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
    
    // コンテキストの安全な構築
    const context = await buildSafeContext(session, currentPhase)
    
    let result
    let nextStep = currentStep
    let nextPhase = currentPhase
    let tokensUsed = 0
    
    // 現在のステップを実行
    if (currentStep === 'THINK') {
      // Think フェーズ
      const prompt = interpolatePrompt(strategy.think.prompt, context)
      
      console.log(`[THINK] Sending request to OpenAI - Phase: ${currentPhase}`)
      console.log(`[THINK] Prompt length: ${prompt.length} characters`)
      
      // GPT API呼び出しにレート制限対策を追加
      const completion = await retryWithBackoff(async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: getSystemPrompt(currentPhase) },
            { role: 'user', content: prompt }
          ],
          temperature: strategy.think.temperature || 0.7,
          max_tokens: strategy.think.maxTokens,
          response_format: { type: 'json_object' }
        })
      }, 'THINK')
      
      console.log(`[THINK] Response received - Tokens used: ${completion.usage?.total_tokens}`)
      tokensUsed = completion.usage?.total_tokens || 0
      
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
      
      // 結果をDBに保存
      const phase = await prisma.cotPhase.upsert({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: currentPhase
          }
        },
        update: {
          thinkPrompt: prompt,
          thinkResult: result as any,
          thinkTokens: completion.usage?.total_tokens || 0,
          thinkAt: new Date(),
          status: 'THINKING'
        },
        create: {
          sessionId,
          phaseNumber: currentPhase,
          thinkPrompt: prompt,
          thinkResult: result as any,
          thinkTokens: completion.usage?.total_tokens || 0,
          thinkAt: new Date(),
          status: 'THINKING'
        }
      })
      
      nextStep = 'EXECUTE'
      
    } else if (currentStep === 'EXECUTE') {
      // Execute フェーズ
      // Think結果を取得
      const phase = await prisma.cotPhase.findUnique({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: currentPhase
          }
        }
      })
      
      if (!phase?.thinkResult) {
        throw new Error('Think result not found')
      }
      const thinkResult = phase.thinkResult as any
      
      console.log(`[EXECUTE] Starting execution - Phase: ${currentPhase}`)
      console.log(`[EXECUTE] Think result keys: ${Object.keys(thinkResult).join(', ')}`)
      
      try {
        // コンテキストのデバッグログ
        console.log(`[EXECUTE] Context before handler:`, {
          hasContext: !!context,
          contextKeys: context ? Object.keys(context) : 'undefined',
          expertise: context?.expertise,
          userConfig: context?.userConfig
        })
        
        result = await strategy.execute.handler(thinkResult, context)
        console.log(`[EXECUTE] Execution completed successfully`)
        if (result.searchResults) {
          console.log(`[EXECUTE] Search results count: ${result.searchResults.length}`)
        }
      } catch (execError) {
        console.error(`[EXECUTE] Execution failed:`, execError)
        console.error(`[EXECUTE] Error type:`, typeof execError)
        console.error(`[EXECUTE] Error details:`, JSON.stringify(execError, null, 2))
        
        // エラーでもresultに何か設定してDBに保存を試みる
        result = {
          error: true,
          message: execError instanceof Error ? execError.message : 'Unknown error',
          searchResults: []
        }
      }
      
      // 結果をDBに保存
      // Phase 1の場合、Perplexityの生応答をexecuteResultに含める
      if (currentPhase === 1 && result.perplexityResponses) {
        // perplexityResponsesカラムが利用できない場合の回避策
        result.savedPerplexityResponses = result.perplexityResponses
        console.log(`[EXECUTE] Including ${result.perplexityResponses.length} Perplexity responses in executeResult`)
      }
      
      const updateData: any = {
        executeResult: result as any,
        executeDuration: Date.now() - startTime,
        executeAt: new Date(),
        status: 'EXECUTING'
      }
      
      await prisma.cotPhase.update({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: currentPhase
          }
        },
        data: updateData
      })
      
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
      // Execute結果を取得
      const phase = await prisma.cotPhase.findUnique({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: currentPhase
          }
        }
      })
      
      if (!phase?.executeResult) {
        throw new Error('Execute result not found')
      }
      const executeResult = phase.executeResult as any
      
      // セッションを再取得（INTEGRATEステップではsessionが未定義の可能性）
      const currentSession = await prisma.cotSession.findUnique({
        where: { id: sessionId }
      })
      
      if (!currentSession) {
        throw new Error('Session not found for INTEGRATE step')
      }
      
      // 元のコンテキストを再構築（theme, style, platformを含む）
      const baseContext = {
        theme: currentSession.theme,
        style: currentSession.style,
        platform: currentSession.platform,
        userConfig: {
          theme: currentSession.theme,
          style: currentSession.style,
          platform: currentSession.platform
        }
      }
      
      const integrateContext = {
        ...baseContext,
        ...context,
        ...(phase.thinkResult as any),
        ...executeResult
      }
      
      const prompt = interpolatePrompt(strategy.integrate.prompt, integrateContext)
      
      console.log(`[INTEGRATE] Sending request to OpenAI - Phase: ${currentPhase}`)
      console.log(`[INTEGRATE] Context keys: ${Object.keys(integrateContext).join(', ')}`)
      console.log(`[INTEGRATE] Prompt length: ${prompt.length} characters`)
      
      // トークン制限チェック
      if (prompt.length > 100000) { // 概算でトークン制限に近い場合
        console.warn(`[INTEGRATE] Prompt is very long (${prompt.length} chars), may hit token limit`)
      }
      
      // GPT API呼び出しにレート制限対策を追加
      const completion = await retryWithBackoff(async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: getSystemPrompt(currentPhase) },
            { role: 'user', content: prompt }
          ],
          temperature: strategy.integrate.temperature || 0.5,
          max_tokens: strategy.integrate.maxTokens,
          response_format: { type: 'json_object' }
        })
      }, 'INTEGRATE')
      
      console.log(`[INTEGRATE] Response received - Tokens used: ${completion.usage?.total_tokens}`)
      tokensUsed = completion.usage?.total_tokens || 0
      
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
      
      // 結果をDBに保存
      await prisma.cotPhase.update({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: currentPhase
          }
        },
        data: {
          integratePrompt: prompt,
          integrateResult: result as any,
          integrateTokens: completion.usage?.total_tokens || 0,
          integrateAt: new Date(),
          status: 'COMPLETED'
        }
      })
      
      // 次のフェーズへ
      if (currentPhase < 4) {
        nextPhase = currentPhase + 1
        nextStep = 'THINK'
        
        // フェーズ完了時点で一旦停止（ユーザー確認待ち）
        await prisma.cotSession.update({
          where: { id: sessionId },
          data: {
            currentPhase: nextPhase,
            currentStep: nextStep,
            status: 'PENDING', // 次のフェーズ開始前は PENDING に戻す
            totalDuration: session.totalDuration + (Date.now() - startTime),
            totalTokens: session.totalTokens + tokensUsed,
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
    const isCompleted = currentPhase === 4 && currentStep === 'INTEGRATE'
    
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
        currentPhase: nextPhase,
        currentStep: nextStep,
        status: nextStatus,
        totalDuration: session.totalDuration + duration,
        totalTokens: session.totalTokens + tokensUsed,
        updatedAt: new Date(),
        ...(isCompleted && { completedAt: new Date() })
      }
    })
    
    // Phase 4が完了したら下書きを作成
    if (isCompleted) {
      const allPhases = await prisma.cotPhase.findMany({
        where: { sessionId },
        orderBy: { phaseNumber: 'asc' }
      })
      await createCompleteDrafts(sessionId, allPhases, session)
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
    
    // エラー分類と処理
    const errorInfo = await classifyAndHandleError(error, await params)
    
    // セッションマネージャーで復旧アクションを決定
    try {
      const { CotSessionManager } = await import('@/lib/cot-session-manager')
      const sessionManager = new CotSessionManager()
      const { sessionId } = await params
      
      const recoveryAction = await sessionManager.determineRecoveryAction(sessionId, error)
      console.log('[ERROR] Recovery action:', recoveryAction)
      
      // 自動リカバリーの実行
      if (recoveryAction.action === 'retry' && errorInfo.retryable) {
        const retryResult = await sessionManager.retrySession(sessionId)
        if (retryResult.success) {
          return NextResponse.json({
            error: errorInfo.userMessage,
            recoveryAction: retryResult,
            message: 'セッションは自動的にリトライされます。しばらくお待ちください。',
            retryAfter: 5
          }, { status: 503 })
        }
      } else if (recoveryAction.action === 'restart_phase') {
        // フェーズ再開の提案
        return NextResponse.json({
          error: errorInfo.userMessage,
          recoveryAction: {
            action: 'restart_phase',
            reason: recoveryAction.reason,
            recommendedPhase: session?.currentPhase || 1
          },
          message: `エラーが発生しました。Phase ${session?.currentPhase || 1}から再開することをお勧めします。`,
          recoveryUrl: `/api/viral/cot-session/${sessionId}/recover`
        }, { status: 500 })
      }
    } catch (recoveryError) {
      console.error('[ERROR] Recovery failed:', recoveryError)
    }
    
    return NextResponse.json(
      {
        error: errorInfo.userMessage,
        details: errorInfo.details,
        errorType: errorInfo.type,
        retryable: errorInfo.retryable,
        retryAfter: errorInfo.retryAfter
      },
      { status: errorInfo.statusCode }
    )
  }
}

// ヘルパー関数
function getSystemPrompt(phase: number): string {
  // 全フェーズで統一：仕様書のロール設定
  return 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
}

function interpolatePrompt(template: string, context: any): string {
  return template.replace(/{(\w+)}/g, (match, key) => {
    if (key === 'searchResults' && context.searchResults) {
      return formatSearchResults(context.searchResults)
    }
    if (key === 'trendedTopics' && context.trendedTopics) {
      return formatTrendedTopics(context.trendedTopics)
    }
    if (key === 'opportunities' && context.opportunities) {
      return formatOpportunities(context.opportunities)
    }
    // オブジェクトの場合はJSON形式で出力
    const value = context[key]
    if (value && typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return value || match
  })
}

function formatSearchResults(searchResults: any): string {
  if (Array.isArray(searchResults)) {
    return searchResults.map((r: any, i: number) => 
      `${i + 1}. ${r.topic || r.title || '不明'}\n   ${r.summary || r.snippet || r.analysis?.substring(0, 200) || '詳細なし'}\n   URL: ${r.url || 'N/A'}\n   ソース: ${r.source || 'N/A'}`
    ).join('\n\n')
  }
  return JSON.stringify(searchResults, null, 2)
}

function formatTrendedTopics(trendedTopics: any): string {
  if (Array.isArray(trendedTopics)) {
    return trendedTopics.map((topic: any, i: number) => 
      `${i + 1}. ${topic.topicName}
   カテゴリ: ${topic.category}
   概要: ${topic.summary}
   現状: ${topic.currentStatus}
   バイラル要素:
   - 論争性: ${topic.viralElements?.controversy || 'N/A'}
   - 感情: ${topic.viralElements?.emotion || 'N/A'}
   - 関連性: ${topic.viralElements?.relatability || 'N/A'}
   - 共有性: ${topic.viralElements?.shareability || 'N/A'}
   - 時間的感度: ${topic.viralElements?.timeSensitivity || 'N/A'}
   - プラットフォーム適合性: ${topic.viralElements?.platformFit || 'N/A'}
   テーマとの関連: ${topic.themeRelevance || 'N/A'}`
    ).join('\n\n')
  }
  return JSON.stringify(trendedTopics, null, 2)
}

function formatOpportunities(opportunities: any): string {
  if (Array.isArray(opportunities)) {
    return opportunities.map((opp: any, i: number) => 
      `${i + 1}. ${opp.topic || opp.topicName}
   スコア: ${opp.viralScore || opp.overallScore || 'N/A'}
   理由: ${opp.reasoning || 'N/A'}`
    ).join('\n\n')
  }
  return JSON.stringify(opportunities, null, 2)
}

async function getPreviousPhaseResults(phases: any[], currentPhase: number): Promise<any> {
  const results: any = {}
  
  // Phase 1の結果を含める
  if (currentPhase > 1) {
    const phase1 = phases.find(p => p.phaseNumber === 1)
    if (phase1?.integrateResult) {
      results.phase1Result = phase1.integrateResult
      // Phase 1のINTEGRATEは新形式でtrendedTopicsを返す
      results.trendedTopics = phase1.integrateResult.trendedTopics || []
      // Phase 2のプロンプトは{opportunities}を期待しているので、trendedTopicsをopportunitiesとしても渡す
      results.opportunities = phase1.integrateResult.trendedTopics || []
      results.categoryInsights = phase1.integrateResult.categoryInsights || {}
      results.searchResults = phase1.executeResult?.searchResults || []
    }
  }
  
  // Phase 2の結果を含める（コンセプトも含まれる）
  if (currentPhase > 2) {
    const phase2 = phases.find(p => p.phaseNumber === 2)
    if (phase2?.integrateResult) {
      results.phase2Result = phase2.integrateResult
      results.concepts = phase2.integrateResult.concepts || []
      results.opportunityCount = phase2.integrateResult.opportunityCount || 0
      results.analysisInsights = phase2.integrateResult.analysisInsights || ''
    }
  }
  
  // Phase 3の結果を含める（コンテンツ）
  if (currentPhase > 3) {
    const phase3 = phases.find(p => p.phaseNumber === 3)
    if (phase3?.integrateResult) {
      results.phase3Result = phase3.integrateResult
      results.contents = phase3.integrateResult.contents || []
    }
  }
  
  // Phase 4の結果を含める（戦略）
  if (currentPhase > 4) {
    const phase4 = phases.find(p => p.phaseNumber === 4)
    if (phase4?.integrateResult) {
      results.phase4Result = phase4.integrateResult
      results.strategy = phase4.integrateResult || {}
    }
  }
  
  return results
}

// GPT APIレート制限対策のリトライ機能
async function retryWithBackoff<T>(
  apiCall: () => Promise<T>,
  operation: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RETRY] ${operation} attempt ${attempt}/${maxRetries}`)
      const result = await apiCall()
      if (attempt > 1) {
        console.log(`[RETRY] ${operation} succeeded on attempt ${attempt}`)
      }
      return result
    } catch (error) {
      lastError = error as Error
      const errorMessage = lastError.message
      
      // レート制限エラーの場合
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        const waitTime = Math.min(2 ** attempt * 1000, 30000) // 最大30秒
        console.log(`[RETRY] ${operation} rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
      }
      
      // トークン制限エラーの場合は即座に失敗
      if (errorMessage.includes('context length') || errorMessage.includes('token')) {
        console.error(`[RETRY] ${operation} token limit exceeded, not retrying`)
        throw lastError
      }
      
      // その他のエラーの場合は短い待機後にリトライ
      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt // 1秒、2秒、3秒
        console.log(`[RETRY] ${operation} failed with: ${errorMessage}, retrying in ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
    }
  }
  
  console.error(`[RETRY] ${operation} failed after ${maxRetries} attempts`)
  throw lastError
}

// セッション復旧処理
async function handleSessionRecovery(session: any): Promise<{
  shouldSkip: boolean
  response?: any
  updated: boolean
}> {
  const currentTime = Date.now()
  const lastUpdateTime = new Date(session.updatedAt).getTime()
  const timeSinceUpdate = currentTime - lastUpdateTime
  
  // 処理中ステータスの場合
  if (['THINKING', 'EXECUTING', 'INTEGRATING'].includes(session.status)) {
    // 2分以内の場合はスキップ（開発環境では30秒に短縮）
    const skipTime = process.env.NODE_ENV === 'development' ? 30 * 1000 : 2 * 60 * 1000
    if (timeSinceUpdate < skipTime) {
      console.log(`[SESSION RECOVERY] Processing in progress, skipping... (${Math.round(timeSinceUpdate / 1000)}s since last update)`)
      return {
        shouldSkip: true,
        response: {
          success: true,
          message: '処理中です',
          sessionId: session.id,
          phase: session.currentPhase,
          step: session.currentStep,
          status: session.status,
          timeSinceUpdate: Math.round(timeSinceUpdate / 1000)
        },
        updated: false
      }
    }
    
    // 2分以上経過している場合は復旧処理
    console.log(`[SESSION RECOVERY] Session stuck in ${session.status}, recovering... (${Math.round(timeSinceUpdate / 1000)}s since last update)`)
    
    await prisma.cotSession.update({
      where: { id: session.id },
      data: {
        status: 'PENDING',
        lastError: `Recovered from stuck ${session.status} state after ${Math.round(timeSinceUpdate / 1000)}s`,
        retryCount: { increment: 1 }
      }
    })
    
    return { shouldSkip: false, updated: true }
  }
  
  return { shouldSkip: false, updated: false }
}

// 安全なコンテキスト構築
async function buildSafeContext(session: any, currentPhase: number): Promise<any> {
  try {
    // セッションが未定義の場合のログ
    if (!session) {
      console.error('[CONTEXT] Session is undefined!')
      throw new Error('Session is undefined in buildSafeContext')
    }
    
    const baseContext = {
      theme: session.theme || 'AIと働き方',
      style: session.style || '洞察的',
      platform: session.platform || 'Twitter',
    }
    
    const userConfig = {
      theme: baseContext.theme,
      style: baseContext.style,
      platform: baseContext.platform
    }
    
    console.log('[CONTEXT] Building context with:', {
      sessionId: session.id,
      theme: baseContext.theme,
      style: baseContext.style,
      platform: baseContext.platform,
      currentPhase,
      hasPhases: !!(session.phases && session.phases.length > 0)
    })
    
    const previousResults = await getPreviousPhaseResults(session.phases || [], currentPhase)
    
    const finalContext = {
      ...baseContext,
      userConfig,
      ...previousResults
    }
    
    console.log('[CONTEXT] Final context keys:', Object.keys(finalContext))
    
    return finalContext
  } catch (error) {
    console.error('[CONTEXT] Error building context:', error)
    console.error('[CONTEXT] Session data:', JSON.stringify(session, null, 2))
    
    // フォールバック：最小限のコンテキスト
    return {
      theme: session?.theme || 'AIと働き方',
      style: session?.style || '洞察的',
      platform: session?.platform || 'Twitter',
      userConfig: {
        theme: session?.theme || 'AIと働き方',
        style: session?.style || '洞察的',
        platform: session?.platform || 'Twitter'
      }
    }
  }
}

// エラー分類と処理
async function classifyAndHandleError(error: any, params: any): Promise<{
  type: string
  userMessage: string
  details: string
  statusCode: number
  retryable: boolean
  retryAfter?: number
}> {
  console.error('[ERROR CLASSIFIER] Processing error:', error)
  
  let errorType = 'UNKNOWN'
  let userMessage = 'セッション処理でエラーが発生しました'
  let statusCode = 500
  let retryable = true
  let retryAfter: number | undefined
  
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // エラータイプの分類
  if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
    errorType = 'TIMEOUT'
    userMessage = '処理がタイムアウトしました。少し時間をおいて再試行してください。'
    retryAfter = 60
  } else if (errorMessage.includes('rate limit') || errorMessage.includes('Too Many Requests')) {
    errorType = 'RATE_LIMIT'
    userMessage = 'APIの利用制限に達しました。しばらくお待ちください。'
    statusCode = 429
    retryAfter = 300
  } else if (errorMessage.includes('context length') || errorMessage.includes('token')) {
    errorType = 'TOKEN_LIMIT'
    userMessage = '処理するデータが大きすぎます。コンテンツを短縮して再試行してください。'
    retryable = false
  } else if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
    errorType = 'PARSE_ERROR'
    userMessage = 'レスポンスの解析に失敗しました。再試行してください。'
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    errorType = 'NETWORK_ERROR'
    userMessage = 'ネットワークエラーが発生しました。接続を確認して再試行してください。'
    retryAfter = 30
  }
  
  // セッション状態の更新
  try {
    if (params) {
      const { sessionId } = await params
      
      const retryCount = await prisma.cotSession.findUnique({
        where: { id: sessionId },
        select: { retryCount: true }
      })
      
      const nextRetryAt = retryAfter ? new Date(Date.now() + retryAfter * 1000) : undefined
      
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'FAILED',
          lastError: `[${errorType}] ${errorMessage}`,
          retryCount: { increment: 1 },
          ...(nextRetryAt && { nextRetryAt })
        }
      })
    }
  } catch (dbError) {
    console.error('[ERROR CLASSIFIER] Failed to update session:', dbError)
  }
  
  return {
    type: errorType,
    userMessage,
    details: errorMessage,
    statusCode,
    retryable,
    retryAfter
  }
}

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