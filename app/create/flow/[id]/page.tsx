'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Brain, Loader2, Check, AlertCircle, ChevronRight, Send } from 'lucide-react'

interface FlowStatus {
  id: string
  theme: string
  currentStep: string
  nextAction: string | null
  progress: {
    phase1_collecting: boolean
    phase2_concepts: boolean
    phase3_contents: boolean
    completed: boolean
  }
  error?: string
  data: {
    topics: any
    concepts: any[]
    selectedConcepts: string[]
    contents: any
  }
}

export default function FlowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const flowId = params.id as string
  
  const [status, setStatus] = useState<FlowStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([])
  const [processingAction, setProcessingAction] = useState(false)

  // ステータス監視
  useEffect(() => {
    if (!flowId) return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/flow/${flowId}`)
        if (!response.ok) throw new Error('ステータス取得失敗')
        
        const data = await response.json()
        setStatus(data)
        
        if (data.error) {
          setError(data.error)
          setLoading(false)
        } else if (data.progress.completed) {
          setLoading(false)
        }
      } catch (err) {
        setError('ステータス確認エラー')
        setLoading(false)
      }
    }

    // 初回チェック
    checkStatus()
    
    // 完了するまでポーリング
    const interval = setInterval(() => {
      if (status?.progress.completed || error) {
        clearInterval(interval)
      } else {
        checkStatus()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [flowId, status?.progress.completed, error])

  // 次のアクション実行
  const executeNextAction = async (actionData?: any) => {
    if (!status) return
    
    setProcessingAction(true)
    
    try {
      const response = await fetch(`/api/flow/${flowId}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData || {})
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '処理に失敗しました')
      }
      
      // ステータスを再取得
      const statusResponse = await fetch(`/api/flow/${flowId}`)
      const newStatus = await statusResponse.json()
      setStatus(newStatus)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setProcessingAction(false)
    }
  }

  // コンセプト選択
  const handleConceptSelection = () => {
    if (selectedConcepts.length === 0) return
    
    const selected = status?.data.concepts.filter(c => 
      selectedConcepts.includes(c.conceptId)
    )
    
    executeNextAction({ selectedConcepts: selected })
  }

  // キャラクター選択
  const handleCharacterSelection = (characterId: string) => {
    executeNextAction({ 
      selectedConcepts: status?.data.selectedConcepts,
      characterId 
    })
  }

  // ステップの表示
  const getStepInfo = (step: string) => {
    const steps: Record<string, { label: string; icon: string }> = {
      initializing: { label: '初期化中', icon: '🚀' },
      collecting_topics: { label: 'トピック収集中', icon: '🔍' },
      generating_concepts: { label: 'コンセプト生成中', icon: '💡' },
      awaiting_concept_selection: { label: 'コンセプト選択待ち', icon: '🎯' },
      awaiting_character_selection: { label: 'キャラクター選択待ち', icon: '🎭' },
      generating_contents: { label: '投稿生成中', icon: '✍️' },
      completed: { label: '完了', icon: '✅' },
      error: { label: 'エラー', icon: '❌' }
    }
    return steps[step] || { label: step, icon: '⏳' }
  }

  if (!status && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg max-w-md">
          <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!status) return null

  const stepInfo = getStepInfo(status.currentStep)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {stepInfo.icon} {stepInfo.label}
              </h1>
              <p className="text-gray-600">テーマ: {status.theme}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>フローID</p>
              <p className="font-mono text-xs">{flowId}</p>
            </div>
          </div>

          {/* プログレスバー */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">進行状況</span>
              <span className="text-sm font-medium text-gray-900">
                {Object.values(status.progress).filter(Boolean).length} / 4 完了
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500 relative"
                style={{ 
                  width: `${(Object.values(status.progress).filter(Boolean).length / 4) * 100}%` 
                }}
              >
                {Object.values(status.progress).filter(Boolean).length > 0 && (
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                )}
              </div>
            </div>
            
            {/* ステップ表示 */}
            <div className="mt-3 flex justify-between text-xs text-gray-500">
              <span className={status.progress.phase1_collecting ? 'text-purple-600 font-medium' : ''}>
                📡 収集
              </span>
              <span className={status.progress.phase2_concepts ? 'text-purple-600 font-medium' : ''}>
                💡 生成
              </span>
              <span className={status.progress.phase3_contents ? 'text-purple-600 font-medium' : ''}>
                ✍️ 執筆
              </span>
              <span className={status.progress.completed ? 'text-green-600 font-medium' : ''}>
                ✅ 完了
              </span>
            </div>
          </div>
        </div>

        {/* ステップ詳細 */}
        <div className="space-y-4">
          {/* Phase 1: トピック収集 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              {status.progress.phase1_collecting ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : status.currentStep === 'collecting_topics' ? (
                <div className="relative">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">Phase 1: 情報収集（Perplexity）</h3>
                {status.currentStep === 'collecting_topics' && (
                  <p className="text-xs text-gray-500 mt-1">
                    ⏱️ 予想時間: 30-60秒（最新情報の検索・分析）
                  </p>
                )}
              </div>
            </div>
            {status.data.topics && (
              <div className="mt-4 ml-9">
                <p className="text-sm text-gray-600 mb-2">
                  トピックの収集が完了しました
                </p>
                {/* トピックデータの表示 */}
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {typeof status.data.topics === 'string' 
                      ? status.data.topics 
                      : JSON.stringify(status.data.topics, null, 2)}
                  </pre>
                </div>
                {/* 次へボタン */}
                {status.currentStep === 'collecting_topics' && status.progress.phase1_collecting && !status.progress.phase2_concepts && (
                  <button
                    onClick={() => executeNextAction()}
                    disabled={processingAction}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    {processingAction ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        処理中...
                      </span>
                    ) : (
                      'コンセプト生成へ進む'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Phase 2: コンセプト生成 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              {status.progress.phase2_concepts ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : status.currentStep === 'generating_concepts' ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">Phase 2: コンセプト生成（GPT）</h3>
                {status.currentStep === 'generating_concepts' && (
                  <p className="text-xs text-gray-500 mt-1">
                    ⏱️ 予想時間: 15-45秒（複数コンセプトの生成・評価）
                  </p>
                )}
              </div>
            </div>
            
            {/* コンセプト選択UI */}
            {status.nextAction === 'select_concepts' && status.data.concepts && (
              <div className="mt-4 ml-9 space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  生成されたコンセプトから最大3つ選択してください：
                </p>
                {status.data.concepts.map((concept: any) => (
                  <label
                    key={concept.conceptId}
                    className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedConcepts.includes(concept.conceptId)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedConcepts.includes(concept.conceptId)}
                      onChange={(e) => {
                        if (e.target.checked && selectedConcepts.length < 3) {
                          setSelectedConcepts([...selectedConcepts, concept.conceptId])
                        } else if (!e.target.checked) {
                          setSelectedConcepts(selectedConcepts.filter(id => id !== concept.conceptId))
                        }
                      }}
                      className="sr-only"
                    />
                    <div className="font-medium text-gray-900">{concept.conceptTitle}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {concept.selectedHook} × {concept.selectedAngle}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      スコア: {concept.viralScore}
                    </div>
                  </label>
                ))}
                <button
                  onClick={handleConceptSelection}
                  disabled={selectedConcepts.length === 0 || processingAction}
                  className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {processingAction ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      処理中...
                    </span>
                  ) : (
                    `選択したコンセプトで続行（${selectedConcepts.length}個）`
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Phase 3: 投稿生成 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3">
              {status.progress.phase3_contents ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : status.currentStep === 'generating_contents' ? (
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">Phase 3: 投稿生成（Claude）</h3>
                {status.currentStep === 'generating_contents' && (
                  <p className="text-xs text-gray-500 mt-1">
                    ⏱️ 予想時間: 10-30秒（キャラクター投稿文の作成）
                  </p>
                )}
              </div>
            </div>
            
            {/* キャラクター選択UI */}
            {status.nextAction === 'select_character' && (
              <div className="mt-4 ml-9">
                <p className="text-sm text-gray-600 mb-3">
                  投稿のトーンを選択してください：
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleCharacterSelection('cardi-dare')}
                    disabled={processingAction}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-left"
                  >
                    <div className="font-medium">カーディ・ダーレ</div>
                    <div className="text-sm text-gray-600 mt-1">
                      シニカルだが愛のある毒舌キャラ
                    </div>
                  </button>
                  <button
                    onClick={() => handleCharacterSelection('neutral')}
                    disabled={processingAction}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 text-left"
                  >
                    <div className="font-medium">ニュートラル</div>
                    <div className="text-sm text-gray-600 mt-1">
                      親しみやすく分かりやすいトーン
                    </div>
                  </button>
                </div>
              </div>
            )}
            
            {/* 生成結果の表示 */}
            {status.data.contents && (
              <div className="mt-4 ml-9">
                <p className="text-sm text-gray-600 mb-2">
                  投稿が生成されました：
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {Array.isArray(status.data.contents) ? (
                    status.data.contents.map((content: any, index: number) => (
                      <div key={index} className="bg-white rounded p-3 border border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          投稿 {index + 1}
                        </div>
                        <div className="text-sm text-gray-900 whitespace-pre-wrap">
                          {content.content || content}
                        </div>
                        {content.hashtags && (
                          <div className="text-xs text-blue-600 mt-2">
                            {content.hashtags.join(' ')}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {typeof status.data.contents === 'string' 
                        ? status.data.contents 
                        : JSON.stringify(status.data.contents, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 完了時のアクション */}
          {status.progress.completed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Check className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold text-green-900">生成完了！</h3>
              </div>
              <p className="text-green-700 mb-4">
                投稿の下書きが作成されました。編集して投稿しましょう。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/publish')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  投稿・スケジュール
                </button>
                <button
                  onClick={() => router.push('/drafts')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  下書きを確認
                </button>
                <button
                  onClick={() => router.push('/create')}
                  className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
                >
                  新規作成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}