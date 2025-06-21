'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Loader2, Check, AlertCircle, Send } from 'lucide-react'
import {
  StepIndicator,
  LoadingOverlay,
  ErrorBoundary,
  StepNavigation,
  APIErrorFallback,
  FLOW_STEPS
} from '@/components/flow'
import { FlowManager, createFlowSession, saveSessionToStorage, loadSessionFromStorage } from '@/lib/flow/manager'
import { FlowSession, FlowStep } from '@/lib/flow/types'
import { transformSessionForFrontend, ViralSessionDB } from '@/lib/flow/db-types'

// Phase別のローディング表示
const PHASE_LOADING_MESSAGES = {
  4: { message: 'Perplexityで最新情報を収集中...', submessage: '予想時間: 30-60秒' },
  8: { message: 'GPTでコンセプトを生成中...', submessage: '予想時間: 15-45秒' },
  12: { message: 'Claudeで投稿文を作成中...', submessage: '予想時間: 10-30秒' }
}

export default function EnhancedFlowPage() {
  const params = useParams()
  const router = useRouter()
  const flowId = params.id as string
  
  const [flowManager, setFlowManager] = useState<FlowManager | null>(null)
  const [flowSession, setFlowSession] = useState<FlowSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  
  // 選択状態
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string>('cardi-dare')
  const [postFormat, setPostFormat] = useState<'single' | 'thread'>('single')

  // セッション初期化
  useEffect(() => {
    initializeSession()
  }, [flowId])

  const initializeSession = async () => {
    try {
      // まず既存のセッションを確認
      const response = await fetch(`/api/create/flow/${flowId}/status`)
      if (!response.ok) throw new Error('セッション取得失敗')
      
      const dbSession: ViralSessionDB = await response.json()
      
      // DBセッションをフロントエンド形式に変換
      const frontendData = transformSessionForFrontend(dbSession)
      
      // FlowSession形式に変換
      let session = loadSessionFromStorage(flowId)
      if (!session) {
        // 新規作成
        session = createFlowSession(
          dbSession.theme,
          dbSession.platform,
          dbSession.style,
          'single' // デフォルト
        )
        session.id = flowId
        
        // DBの進捗に基づいてステップを更新
        updateSessionStepsFromDB(session, dbSession)
      }
      
      const manager = new FlowManager(session)
      setFlowManager(manager)
      setFlowSession(session)
      
      // 選択状態の復元
      if (dbSession.selected_ids.length > 0) {
        setSelectedConcepts(dbSession.selected_ids)
      }
      
      setLoading(false)
      
      // 自動実行ステップの処理
      checkAndExecuteAutoStep(manager)
      
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
    
    // 完了したステップをマーク
    if (progress.phase1_collecting) {
      markStepsCompleted(session, [1, 2, 3, 4, 5, 6])
    }
    if (progress.phase2_concepts) {
      markStepsCompleted(session, [7, 8, 9])
    }
    if (dbSession.selected_ids.length > 0) {
      markStepsCompleted(session, [10])
    }
    if (progress.phase3_contents) {
      markStepsCompleted(session, [11, 12, 13, 14, 15, 16])
    }
    
    // 現在のステップを設定
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
        return 2 // DB保存
      case 'COLLECTING':
        return 4 // Perplexity実行
      case 'TOPICS_COLLECTED':
        return dbSession.concepts ? 10 : 7 // コンセプト生成済みなら選択へ
      case 'GENERATING_CONCEPTS':
        return 8 // コンセプト生成中
      case 'CONCEPTS_GENERATED':
        if (dbSession.selected_ids.length === 0) return 10 // コンセプト選択
        if (!dbSession.contents) return 11 // Claude準備
        return 14 // 投稿文表示
      case 'DRAFTS_CREATED':
        return 16 // 完了
      default:
        return 1
    }
  }

  // 自動実行ステップのチェック
  const checkAndExecuteAutoStep = async (manager: FlowManager) => {
    const currentStep = manager.getCurrentStep()
    if (!currentStep || !manager.isAutoExecute(currentStep.id)) return
    
    // 2秒待ってから自動実行
    setTimeout(() => {
      executeStep(currentStep.id)
    }, 2000)
  }

  // ステップ実行
  const executeStep = async (stepId: number) => {
    if (!flowManager) return
    
    setApiLoading(true)
    
    try {
      switch (stepId) {
        case 2: // DB保存
        case 4: // Perplexity実行
        case 8: // コンセプト生成
          await executeAPIStep('process')
          break
          
        case 10: // コンセプト選択
          if (selectedConcepts.length === 0) {
            setError('コンセプトを選択してください')
            setApiLoading(false)
            return
          }
          await executeAPIStep('process', { selectedConceptIds: selectedConcepts })
          break
          
        case 11: // キャラクター選択
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
          saveSessionToStorage(updatedSession)
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
    
    // セッション再読み込み
    await initializeSession()
  }

  // ナビゲーション
  const handleNext = () => {
    if (!flowManager) return
    const currentStep = flowManager.getCurrentStep()
    if (!currentStep) return
    
    executeStep(currentStep.id)
  }

  const handleBack = () => {
    if (!flowManager) return
    flowManager.goToPreviousStep()
    const updatedSession = flowManager.getSession()
    setFlowSession({...updatedSession})
    saveSessionToStorage(updatedSession)
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
        <APIErrorFallback error={{ message: error }} onRetry={initializeSession} />
      </div>
    )
  }

  if (!flowSession || !flowManager) return null

  const currentStep = flowManager.getCurrentStep()
  const progress = flowManager.getProgress()

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  コンテンツ生成フロー
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  テーマ: {flowSession.theme}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">進捗</p>
                <p className="text-2xl font-bold text-purple-600">{progress}%</p>
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
        <div className="max-w-7xl mx-auto px-4 pb-20">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {currentStep && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  ステップ {currentStep.id}: {currentStep.name}
                </h2>
                
                {/* ステップ別のコンテンツ表示 */}
                {renderStepContent(currentStep)}
              </div>
            )}
          </div>
        </div>

        {/* ナビゲーション */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
          <div className="max-w-7xl mx-auto">
            <StepNavigation
              currentStep={flowSession.currentStep}
              totalSteps={16}
              canGoBack={!apiLoading && flowSession.currentStep > 1}
              canGoNext={!apiLoading && canProceed()}
              onBack={handleBack}
              onNext={handleNext}
              isLoading={apiLoading}
            />
          </div>
        </div>

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

  // ステップ別コンテンツのレンダリング
  function renderStepContent(step: FlowStep) {
    // 実装は既存のpage.tsxから移植
    return <div>Step {step.id} content</div>
  }

  // 次へ進めるかの判定
  function canProceed(): boolean {
    if (!currentStep) return false
    
    switch (currentStep.id) {
      case 10: // コンセプト選択
        return selectedConcepts.length > 0
      case 11: // キャラクター選択
        return true // 常に進める
      default:
        return true
    }
  }
}