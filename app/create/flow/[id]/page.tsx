'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Loader2, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import {
  StepIndicator,
  LoadingOverlay,
  ErrorBoundary,
  StepNavigation,
  FLOW_STEPS
} from '@/components/flow'
import {
  ThemeInputStep,
  TopicsDisplayStep,
  ConceptSelectionStep,
  CharacterSelectionStep,
  ContentDisplayStep,
  DraftCompleteStep
} from '@/components/flow/steps'
import { FlowManager, createFlowSession, saveSessionToStorage, loadSessionFromStorage } from '@/lib/flow/manager'
import { FlowSession } from '@/lib/flow/types'
import { transformSessionForFrontend, ViralSessionDB } from '@/lib/flow/db-types'
import { JSTClock } from '@/components/flow/JSTClock'
import { useFlowProgress } from '@/lib/hooks/useFlowProgress'
import { useDBFlowSession } from '@/lib/hooks/use-db-flow-session'

// Phase別のローディング表示
const PHASE_LOADING_MESSAGES: Record<number, { message: string; submessage: string }> = {
  4: { message: 'Perplexityで最新情報を収集中...', submessage: '予想時間: 30-60秒' },
  8: { message: 'GPTでコンセプトを生成中...', submessage: '予想時間: 15-45秒' },
  12: { message: 'Claudeで投稿文を作成中...', submessage: '予想時間: 10-30秒' }
}

export default function NewFlowPage() {
  const params = useParams()
  const router = useRouter()
  const flowId = params.id as string
  
  const [flowManager, setFlowManager] = useState<FlowManager | null>(null)
  const [flowSession, setFlowSession] = useState<FlowSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  
  // DB主導フック（段階的移行のため追加）
  const { 
    session: dbSessionData, 
    loading: dbLoading, 
    error: dbError,
    refresh: refreshDBSession 
  } = useDBFlowSession(flowId)
  
  // DBからのデータ
  const [dbData, setDbData] = useState<any>(null)
  
  // 選択状態
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string>('cardi-dare')
  const [postFormat, setPostFormat] = useState<'single' | 'thread'>('single')

  // リアルタイム進捗追跡
  const { progress: realtimeProgress, isConnected, error: progressError } = useFlowProgress(
    flowId === 'new' ? null : flowId,
    (progress) => {
      // リアルタイムの進捗更新を反映
      if (progress.status !== dbData?.status) {
        initializeSession()
      }
    }
  )

  // セッション初期化
  useEffect(() => {
    if (flowId === 'new') {
      // 新規フロー作成
      const session = createFlowSession('', 'Twitter', 'エンターテイメント', 'single')
      const manager = new FlowManager(session)
      setFlowManager(manager)
      setFlowSession(session)
      setLoading(false)
    } else {
      // 既存セッションの読み込み
      initializeSession()
    }
  }, [flowId])

  const initializeSession = async () => {
    try {
      // DB主導フックを使用（既にデータが取得されている場合）
      if (dbSessionData) {
        setDbData(dbSessionData)
        
        // DBセッションをフロントエンド形式に変換
        const frontendData = transformSessionForFrontend(dbSessionData)
        
        // FlowSession形式に変換
        let session = loadSessionFromStorage(flowId)
        if (!session) {
          session = createFlowSession(
            dbSessionData.theme,
            dbSessionData.platform,
            dbSessionData.style,
            'single'
          )
          session.id = flowId
          updateSessionStepsFromDB(session, dbSessionData)
        }
        
        const manager = new FlowManager(session)
        setFlowManager(manager)
        setFlowSession(session)
        
        if (dbSessionData.selected_ids?.length > 0) {
          setSelectedConcepts(dbSessionData.selected_ids)
        }
        
        setLoading(false)
        checkAndExecuteAutoStep(manager)
      } else {
        // DBからデータが取得できない場合はLocalStorageから読み込み（後方互換性）
        const storedSession = loadSessionFromStorage(flowId)
        if (storedSession) {
          const manager = new FlowManager(storedSession)
          setFlowManager(manager)
          setFlowSession(storedSession)
          setLoading(false)
          checkAndExecuteAutoStep(manager)
        } else {
          setError('セッションが見つかりません')
          setLoading(false)
        }
      }
    } catch (err) {
      setError('セッションの初期化に失敗しました')
      setLoading(false)
    }
  }

  // DBの状態に基づいてステップを更新
  const updateSessionStepsFromDB = (session: FlowSession, dbSession: ViralSessionDB) => {
    const progress = {
      phase1_collecting: dbSession.status !== 'CREATED' && dbSession.topics != null,
      phase2_concepts: ['GENERATING_CONCEPTS', 'CONCEPTS_GENERATED', 'DRAFTS_CREATED'].includes(dbSession.status),
      phase3_contents: dbSession.status === 'DRAFTS_CREATED'
    }
    
    if (progress.phase1_collecting) {
      markStepsCompleted(session, [1, 2, 3, 4, 5, 6])
    }
    if (progress.phase2_concepts) {
      markStepsCompleted(session, [7, 8, 9])
    }
    if (dbSession.selected_ids?.length > 0) {
      markStepsCompleted(session, [10])
    }
    if (progress.phase3_contents) {
      markStepsCompleted(session, [11, 12, 13, 14, 15, 16])
    }
    
    const currentStepId = determineCurrentStep(dbSession)
    session.currentStep = currentStepId
    session.steps.forEach(step => {
      if (step.id === currentStepId) {
        step.status = 'current'
      }
    })
  }

  const markStepsCompleted = (session: FlowSession, stepIds: number[]) => {
    session.steps.forEach(step => {
      if (stepIds.includes(step.id)) {
        step.status = 'completed'
      }
    })
  }

  const determineCurrentStep = (dbSession: ViralSessionDB): number => {
    switch (dbSession.status) {
      case 'CREATED':
        return dbSession.theme ? 2 : 1
      case 'COLLECTING':
        return 4
      case 'TOPICS_COLLECTED':
        return dbSession.concepts ? 10 : 7
      case 'GENERATING_CONCEPTS':
        return 8
      case 'CONCEPTS_GENERATED':
        if (dbSession.selected_ids?.length === 0) return 10
        if (!dbSession.contents) return 11
        return 14
      case 'DRAFTS_CREATED':
        return 16
      default:
        return 1
    }
  }

  // 自動実行ステップのチェック
  const checkAndExecuteAutoStep = async (manager: FlowManager) => {
    const currentStep = manager.getCurrentStep()
    if (!currentStep || !manager.isAutoExecute(currentStep.id)) return
    
    setTimeout(() => {
      executeStep(currentStep.id)
    }, 2000)
  }

  // ステップ実行
  // DBセッションの更新
  const updateDBSession = async (updates: Partial<ViralSessionDB>) => {
    if (!flowId || flowId === 'new') return
    
    try {
      const response = await fetch(`/api/create/flow/${flowId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        console.error('Failed to update DB session')
      } else {
        // DB更新後にセッションを再取得
        await refreshDBSession()
      }
    } catch (error) {
      console.error('DB update error:', error)
    }
  }

  const executeStep = async (stepId: number) => {
    if (!flowManager) return
    
    setApiLoading(true)
    
    try {
      switch (stepId) {
        case 1: // テーマ入力は手動
          break
          
        case 2: // DB保存
        case 3: // プロンプト準備
        case 4: // Perplexity実行
        case 5: // トピック保存
        case 7: // GPT準備
        case 8: // コンセプト生成
        case 9: // コンセプト保存
          await executeAPIStep('process')
          break
          
        case 10: // コンセプト選択は手動
          break
          
        case 11: // キャラクター選択
        case 12: // 投稿文生成
        case 13: // 投稿文保存
          await executeAPIStep('generate', { 
            selectedConceptIds: selectedConcepts,
            characterId: selectedCharacter,
            postFormat 
          })
          break
          
        case 15: // 下書き作成
          await executeAPIStep('create-draft')
          break
          
        default:
          // その他の自動ステップ
          flowManager.proceedToNextStep()
          const updatedSession = flowManager.getSession()
          setFlowSession({...updatedSession})
          
          // DB主導: LocalStorage保存からDB更新へ
          if (dbSessionData) {
            await updateDBSession({
              current_step: updatedSession.currentStep,
              step_status: JSON.stringify(updatedSession.steps.map(s => ({
                id: s.id,
                status: s.status,
                data: s.data
              })))
            })
          } else {
            // 後方互換性のためLocalStorageも更新
            saveSessionToStorage(updatedSession)
          }
          
          checkAndExecuteAutoStep(flowManager)
      }
    } catch (err) {
      flowManager.setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setFlowSession({...flowManager.getSession()})
    } finally {
      setApiLoading(false)
    }
  }

  // API呼び出し
  const executeAPIStep = async (action: string, data?: any) => {
    const endpoint = action === 'generate' 
      ? `/api/create/flow/${flowId}/generate`
      : action === 'create-draft'
      ? `/api/create/flow/${flowId}/draft`
      : `/api/create/flow/${flowId}/${action}`
      
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'API呼び出しに失敗しました')
    }
    
    await initializeSession()
  }

  // ステップハンドラー
  const handleThemeSubmit = async (data: { theme: string; style: string; platform: string }) => {
    if (flowId === 'new') {
      // 新規セッション作成
      const response = await fetch('/api/create/flow/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        setError('セッション作成に失敗しました')
        return
      }
      
      const { id } = await response.json()
      router.push(`/create/flow/${id}`)
    } else {
      // 既存セッションの更新
      flowManager?.proceedToNextStep(data)
      setFlowSession({...flowManager!.getSession()})
      
      // DBセッションを更新
      await updateDBSession({
        theme: data.theme,
        style: data.style,
        platform: data.platform
      })
      
      executeStep(2)
    }
  }

  const handleConceptSelection = async (selectedIds: string[]) => {
    setSelectedConcepts(selectedIds)
    flowManager?.proceedToNextStep({ selectedIds })
    setFlowSession({...flowManager!.getSession()})
    
    // DBセッションを更新
    await updateDBSession({
      selected_ids: selectedIds
    })
    
    executeStep(11)
  }

  const handleCharacterSelection = async (characterId: string, format: 'single' | 'thread') => {
    setSelectedCharacter(characterId)
    setPostFormat(format)
    flowManager?.proceedToNextStep({ characterId, postFormat: format })
    setFlowSession({...flowManager!.getSession()})
    
    // DBセッションを更新
    await updateDBSession({
      character_profile_id: characterId,
      post_format: format
    })
    
    executeStep(12)
  }

  const handleContentConfirm = async () => {
    flowManager?.proceedToNextStep()
    setFlowSession({...flowManager!.getSession()})
    
    // DBセッションのステータスを更新
    await updateDBSession({
      status: 'DRAFTS_CREATED'
    })
    
    executeStep(15)
  }

  // ナビゲーション
  const handleNext = () => {
    if (!flowManager) return
    const currentStep = flowManager.getCurrentStep()
    if (!currentStep) return
    
    executeStep(currentStep.id)
  }

  const handleBack = async () => {
    if (!flowManager) return
    flowManager.goToPreviousStep()
    const updatedSession = flowManager.getSession()
    setFlowSession({...updatedSession})
    
    // DB主導: LocalStorage保存からDB更新へ
    if (dbSessionData) {
      await updateDBSession({
        current_step: updatedSession.currentStep,
        step_status: JSON.stringify(updatedSession.steps.map(s => ({
          id: s.id,
          status: s.status,
          data: s.data
        })))
      })
    } else {
      // 後方互換性のためLocalStorageも更新
      saveSessionToStorage(updatedSession)
    }
  }

  // レンダリング
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingOverlay message="セッション読み込み中..." />
      </div>
    )
  }

  if (error && !flowSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 p-6 rounded-lg max-w-md">
          <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!flowSession || !flowManager) return null

  const currentStep = flowManager.getCurrentStep()
  const progress = flowManager.getProgress()

  // ステップ別コンテンツのレンダリング
  const renderStepContent = () => {
    if (!currentStep) return null
    
    switch (currentStep.id) {
      case 1:
        return (
          <ThemeInputStep
            initialTheme={flowSession.theme}
            onSubmit={handleThemeSubmit}
            isLoading={apiLoading}
          />
        )
        
      case 6:
        return (
          <TopicsDisplayStep
            topics={dbData?.topics || []}
            rawData={dbData?.topics}
            onConfirm={handleNext}
            isLoading={apiLoading}
          />
        )
        
      case 10:
        return (
          <ConceptSelectionStep
            concepts={dbData?.concepts || []}
            onSelect={handleConceptSelection}
            isLoading={apiLoading}
          />
        )
        
      case 11:
        return (
          <CharacterSelectionStep
            postFormat={postFormat}
            onSelect={handleCharacterSelection}
            isLoading={apiLoading}
          />
        )
        
      case 14:
        return (
          <ContentDisplayStep
            contents={dbData?.contents || []}
            postFormat={postFormat}
            characterName={selectedCharacter === 'cardi-dare' ? 'Cardi Dare' : 'ニュートラル'}
            onConfirm={handleContentConfirm}
            isLoading={apiLoading}
          />
        )
        
      case 16:
        return (
          <DraftCompleteStep
            draft={{
              id: dbData?.draft_id || flowId,
              title: dbData?.theme || 'バイラルコンテンツ',
              content: Array.isArray(dbData?.contents) 
                ? dbData.contents.map((c: any) => c.content || c).join('\n\n')
                : dbData?.contents || '',
              hashtags: dbData?.hashtags || [],
              characterId: selectedCharacter,
              postFormat: postFormat,
              createdAt: new Date(dbData?.created_at || Date.now()),
              updatedAt: new Date(dbData?.updated_at || Date.now())
            }}
            onPublishNow={async () => {
              // 今すぐ投稿
              const response = await fetch('/api/publish/post/now', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftId: dbData?.draft_id || flowId })
              })
              if (response.ok) {
                router.push('/drafts')
              }
            }}
            onSchedule={async (scheduledAt) => {
              // 予約投稿
              const response = await fetch('/api/automation/scheduler/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  draftId: dbData?.draft_id || flowId,
                  scheduledAt: scheduledAt.toISOString()
                })
              })
              if (response.ok) {
                router.push('/drafts')
              }
            }}
            onEdit={() => router.push(`/drafts/${dbData?.draft_id || flowId}/edit`)}
            isLoading={apiLoading}
          />
        )
        
      default:
        return (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">{currentStep.description}</p>
          </div>
        )
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Cardi-SYSTEM フロー
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {flowSession.theme || 'テーマ未設定'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* リアルタイム接続状態 */}
                {flowId !== 'new' && (
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500">
                      {isConnected ? 'リアルタイム更新中' : 'オフライン'}
                    </span>
                  </div>
                )}
                <JSTClock />
                <div className="text-right">
                  <p className="text-sm text-gray-500">進捗</p>
                  <p className="text-2xl font-bold text-purple-600">{progress}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ステップインジケーター */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <StepIndicator 
            steps={flowSession.steps}
            currentStep={flowSession.currentStep}
            variant="horizontal"
          />
        </div>

        {/* メインコンテンツ */}
        <div className="max-w-4xl mx-auto px-4 pb-20">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {currentStep && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {currentStep.id}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {currentStep.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {currentStep.description}
                    </p>
                  </div>
                </div>
                
                {/* ステップ別のコンテンツ表示 */}
                {renderStepContent()}
              </div>
            )}
          </div>
        </div>

        {/* ナビゲーション */}
        {!apiLoading && currentStep && ![1, 6, 10, 11, 14, 16].includes(currentStep.id) && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
            <div className="max-w-7xl mx-auto">
              <StepNavigation
                currentStep={flowSession.currentStep}
                totalSteps={16}
                canGoBack={!apiLoading && flowSession.currentStep > 1}
                canGoNext={!apiLoading}
                onBack={handleBack}
                onNext={handleNext}
                isLoading={apiLoading}
              />
            </div>
          </div>
        )}

        {/* ローディングオーバーレイ */}
        {apiLoading && currentStep && PHASE_LOADING_MESSAGES[currentStep.id] && (
          <LoadingOverlay
            {...PHASE_LOADING_MESSAGES[currentStep.id]}
            fullScreen
          />
        )}
      </div>
    </ErrorBoundary>
  )
}