'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

interface StepData {
  step1?: any
  step2?: any
  step3?: any
  step4?: any
  step5?: any
}

export default function GptSessionDetail() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [stepData, setStepData] = useState<StepData>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [chainResult, setChainResult] = useState<any>(null)
  const [executingChain, setExecutingChain] = useState(false)
  const [fastResult, setFastResult] = useState<any>(null)
  const [stepProgress, setStepProgress] = useState<Record<number, number>>({})

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  useEffect(() => {
    if (stepData.step1) {
      console.log('Step 1 data:', stepData.step1)
      console.log('articleAnalysis:', stepData.step1.articleAnalysis)
    }
  }, [stepData.step1])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/viral/gpt-session/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
        setCurrentStep(data.session.metadata?.currentStep || 1)
        setStepData(data.session.response || {})
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
    }
  }

  const executeStep = async (step: number) => {
    setLoading(true)
    setStepProgress(prev => ({ ...prev, [step]: 0 }))
    
    try {
      // プログレスバーのシミュレーション
      const progressInterval = setInterval(() => {
        setStepProgress(prev => {
          const current = prev[step] || 0
          if (current < 90) {
            return { ...prev, [step]: current + Math.random() * 15 }
          }
          return prev
        })
      }, 500)
      
      // Step 1の場合は、使用するAPIを選択
      let endpoint = `/api/viral/gpt-session/${sessionId}/step${step}`
      
      if (step === 1 && session?.metadata?.config?.model === 'gpt-4o') {
        // GPT-4oの場合はResponses APIを使用（Web検索対応）
        endpoint = `/api/viral/gpt-session/${sessionId}/step1-responses`
        console.log('Using Responses API with web_search tool for Step 1')
      }
      
      const response = await fetch(endpoint, {
        method: 'POST'
      })

      clearInterval(progressInterval)
      setStepProgress(prev => ({ ...prev, [step]: 100 }))

      if (response.ok) {
        const data = await response.json()
        console.log(`Step ${step} response:`, data)
        
        // 直接ステートを更新（fetchSessionは呼ばない）
        // APIレスポンスからデータを正しく取得
        const stepResult = data.response || data.analysis || data
        setStepData(prev => ({ ...prev, [`step${step}` as keyof StepData]: stepResult }))
        setCurrentStep(step + 1)
        // セッションのメタデータも更新
        setSession((prev: any) => ({
          ...prev,
          metadata: {
            ...prev?.metadata,
            currentStep: step + 1,  // 次のステップに進む
            [`step${step}CompletedAt`]: new Date().toISOString(),
            completed: step === 5  // Step 5の後は完了とする
          }
        }))
      }
    } catch (error) {
      console.error(`Failed to execute step ${step}:`, error)
    } finally {
      setLoading(false)
      // プログレスを少し遅延させてからリセット
      setTimeout(() => {
        setStepProgress(prev => {
          const { [step]: _, ...rest } = prev
          return rest
        })
      }, 1000)
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const executeChainOfThought = async () => {
    setExecutingChain(true)
    // 全ステップのプログレスを初期化
    setStepProgress({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
    
    try {
      // プログレスバーのシミュレーション（約15秒ずつ）
      const progressIntervals: NodeJS.Timeout[] = []
      
      // 各ステップの進捗をシミュレート
      for (let i = 1; i <= 5; i++) {
        const delay = (i - 1) * 12000 // 各ステップの開始時間
        setTimeout(() => {
          const interval = setInterval(() => {
            setStepProgress(prev => {
              const current = prev[i] || 0
              if (current < 95) {
                return { ...prev, [i]: Math.min(current + Math.random() * 20, 95) }
              }
              return prev
            })
          }, 1000)
          progressIntervals.push(interval)
        }, delay)
      }
      
      const response = await fetch(`/api/viral/gpt-session/${sessionId}/chain-hybrid`, {
        method: 'POST'
      })

      // すべてのインターバルをクリア
      progressIntervals.forEach(interval => clearInterval(interval))
      
      // すべてのステップを100%に
      setStepProgress({ 1: 100, 2: 100, 3: 100, 4: 100, 5: 100 })

      if (response.ok) {
        const data = await response.json()
        console.log('Chain of Thought response:', data)
        setChainResult(data)
        
        // セッションのメタデータも更新
        setSession((prev: any) => ({
          ...prev,
          metadata: {
            ...prev?.metadata,
            chainHybridCompleted: true,
            chainHybridCompletedAt: new Date().toISOString()
          }
        }))
        
        // 再度セッションを取得して最新データを反映
        await fetchSession()
      }
    } catch (error) {
      console.error('Failed to execute Chain of Thought:', error)
    } finally {
      setExecutingChain(false)
    }
  }

  const formatDate = (date: string) => {
    return formatInTimeZone(new Date(date), 'Asia/Tokyo', 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })
  }

  const stepInfo = [
    { step: 1, title: 'データ収集・初期分析', icon: '📊' },
    { step: 2, title: 'トレンド評価・角度分析', icon: '🎯' },
    { step: 3, title: 'コンテンツコンセプト作成', icon: '💡' },
    { step: 4, title: '完全コンテンツ生成', icon: '✍️' },
    { step: 5, title: '実行戦略', icon: '🚀' }
  ]

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/viral/gpt" className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ダッシュボードに戻る
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GPT分析セッション
          </h1>
          <p className="text-gray-600">
            作成日時: {formatDate(session.createdAt)}
          </p>
        </div>

        {/* プログレスバー */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            {stepInfo.map((info, index) => (
              <div key={info.step} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                    currentStep > info.step 
                      ? 'bg-green-100 text-green-600' 
                      : currentStep === info.step 
                      ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-200' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {info.icon}
                  </div>
                  <p className={`text-xs mt-2 text-center ${
                    currentStep >= info.step ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}>
                    {info.title}
                  </p>
                </div>
                {index < stepInfo.length - 1 && (
                  <div className={`absolute top-6 left-1/2 w-full h-0.5 ${
                    currentStep > info.step ? 'bg-green-400' : 'bg-gray-200'
                  }`} style={{ transform: 'translateX(50%)' }} />
                )}
              </div>
            ))}
          </div>

          {/* 現在のステップのアクション */}
          {currentStep <= 5 && !session.metadata?.completed && (
            <div className="mt-8 text-center">
              <p className="text-gray-600 mb-4">
                {stepData[`step${currentStep - 1}` as keyof StepData]?.nextStep?.message || 
                 `Step ${currentStep}: ${stepInfo[currentStep - 1].title}を実行します`}
              </p>
              
              {/* GPT-4oでStep 1の場合、Web検索機能の説明を表示 */}
              {currentStep === 1 && session?.metadata?.config?.model === 'gpt-4o' && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg inline-flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-sm text-blue-800">
                    GPT-4oのWeb検索機能を使用して最新ニュースを取得します
                  </span>
                </div>
              )}
              
              {/* プログレスバー表示 */}
              {stepProgress[currentStep] !== undefined && (
                <div className="mb-4 max-w-md mx-auto">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${stepProgress[currentStep]}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {Math.round(stepProgress[currentStep])}% 完了
                  </p>
                </div>
              )}
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => executeStep(currentStep)}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? '実行中...' : currentStep === 1 ? '分析を開始' : '続行'}
                </button>
                
                {/* Chain of Thought一括実行ボタン */}
                {currentStep === 1 && !session.metadata?.chainHybridCompleted && (
                  <>
                    <button
                      onClick={executeChainOfThought}
                      disabled={executingChain || loading}
                      className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {executingChain ? '実行中... (約60秒)' : '🚀 Chain of Thought一括実行'}
                    </button>
                    
                    {/* Chain of Thought実行中のプログレス表示 */}
                    {executingChain && (
                      <div className="mt-4 space-y-2 max-w-md mx-auto">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div key={step} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-16">Step {step}:</span>
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 transition-all duration-500 ease-out"
                                style={{ width: `${stepProgress[step] || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">
                              {Math.round(stepProgress[step] || 0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Step 3以降で下書き管理へのリンクを表示 */}
              {currentStep > 3 && (
                <div className="mt-4">
                  <Link 
                    href={`/viral/drafts?sessionId=${sessionId}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    生成されたコンテンツを編集 →
                  </Link>
                </div>
              )}
            </div>
          )}

          {(session.metadata?.completed || session.metadata?.chainHybridCompleted) && (
            <div className="mt-8 text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ {session.metadata?.chainHybridCompleted ? 'Chain of Thought分析が完了しました' : 'すべての分析が完了しました'}
              </p>
              <Link 
                href={`/viral/drafts?sessionId=${sessionId}`}
                className="inline-block mt-2 text-blue-600 hover:text-blue-800"
              >
                生成された下書きを確認 →
              </Link>
            </div>
          )}
        </div>

        {/* 各ステップの結果表示 */}
        <div className="space-y-6">
          {/* Step 1 結果 */}
          {stepData.step1 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Step 1: データ収集・初期分析結果
              </h2>
              
              <div className="space-y-4">
                {/* 分析サマリー */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-3">📝 分析サマリー</h3>
                  <p className="text-gray-700 mb-4">{stepData.step1.summary}</p>
                  
                  {/* キーポイント */}
                  {stepData.step1.keyPoints && (
                    <div className="bg-white rounded p-3 border border-purple-200">
                      <h4 className="font-medium text-purple-800 mb-2">🎯 キーポイント</h4>
                      <ul className="space-y-1">
                        {stepData.step1.keyPoints.map((point: string, idx: number) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start">
                            <span className="text-purple-500 mr-2">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* 記事詳細分析 */}
                {stepData.step1?.articleAnalysis && stepData.step1.articleAnalysis.length > 0 ? (
                  <div className="mb-4">
                    <h3 className="font-medium text-blue-900 mb-3">📰 記事別詳細分析</h3>
                    <div className="space-y-4">
                      {stepData.step1.articleAnalysis.map((article: any, idx: number) => (
                        <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-2">{article.title}</h4>
                          <div className="text-sm text-gray-700 space-y-2">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span><span className="font-medium">ソース:</span> {article.source}</span>
                              {article.publishDate && (
                                <span><span className="font-medium">公開日:</span> {article.publishDate}</span>
                              )}
                              <span><span className="font-medium">カテゴリ:</span> {article.category}</span>
                              <span><span className="font-medium">重要度:</span> <span className="text-blue-600 font-semibold">{(article.importance * 100).toFixed(0)}%</span></span>
                            </div>
                            
                            {article.url && (
                              <div className="text-xs">
                                <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  記事を読む →
                                </a>
                              </div>
                            )}
                            
                            {article.summary && (
                              <div className="mt-2 p-3 bg-white rounded">
                                <p className="text-gray-700">{article.summary}</p>
                              </div>
                            )}
                            
                            {article.keyPoints && article.keyPoints.length > 0 && (
                              <div className="mt-2">
                                <p className="font-medium text-blue-800 mb-1">キーポイント:</p>
                                <ul className="space-y-1">
                                  {article.keyPoints.map((point: string, pointIdx: number) => (
                                    <li key={pointIdx} className="flex items-start">
                                      <span className="text-blue-600 mr-2">•</span>
                                      <span className="text-sm">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {article.viralPotential && (
                              <div className="mt-2 p-2 bg-yellow-100 rounded">
                                <p className="text-sm font-medium text-yellow-800">
                                  💡 バズる理由: {article.viralPotential}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  stepData.step1 && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800">
                        記事詳細分析が見つかりません。
                        {stepData.step1.articleAnalysis === undefined && ' (articleAnalysisが未定義)'}
                        {stepData.step1.articleAnalysis?.length === 0 && ' (空の配列)'}
                      </p>
                    </div>
                  )
                )}

                {/* 現在の出来事 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <button
                    onClick={() => toggleSection('currentEvents')}
                    className="w-full flex justify-between items-center text-left"
                  >
                    <h3 className="font-medium">現在の出来事の分析</h3>
                    <svg className={`w-5 h-5 transform transition-transform ${expandedSections.currentEvents ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedSections.currentEvents && stepData.step1.currentEvents && (
                    <div className="mt-4 space-y-3">
                      {Object.entries(stepData.step1.currentEvents).map(([key, items]: [string, any]) => (
                        <div key={key} className="bg-gray-50 rounded p-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            {key === 'latestNews' && '最新ニュース'}
                            {key === 'techAnnouncements' && 'テクノロジー発表'}
                            {key === 'businessNews' && 'ビジネスニュース'}
                            {key === 'culturalMoments' && '文化的瞬間'}
                          </h4>
                          <ul className="space-y-1">
                            {Array.isArray(items) && items.slice(0, 3).map((item: any, idx: number) => (
                              <li key={idx} className="text-sm text-gray-600">
                                • {item.title} (影響度: {(item.impact * 100).toFixed(0)}%)
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* バイラルパターン */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">バイラルパターン認識</h3>
                  {stepData.step1.viralPatterns?.topOpportunities && (
                    <div className="space-y-3">
                      {stepData.step1.viralPatterns?.topOpportunities?.map((opp: any, idx: number) => (
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">{opp.topic}</h4>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">論争度:</span>
                              <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-red-400"
                                  style={{ width: `${(opp.scores?.controversy || 0) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">感情強度:</span>
                              <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-orange-400"
                                  style={{ width: `${(opp.scores?.emotion || 0) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">共有性:</span>
                              <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-400"
                                  style={{ width: `${(opp.scores?.shareability || 0) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-gray-700">
                            総合スコア: <span className="font-semibold">{((opp.overallScore || 0) * 100).toFixed(0)}%</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800 text-center">
                    <span className="text-2xl">🎯</span> バズる機会: <span className="font-bold text-3xl text-blue-900">{stepData.step1.opportunityCount || stepData.step1.analysis?.opportunityCount || 0}</span><span className="text-xl">件</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 結果 */}
          {stepData.step2 && console.log('Step 2 data:', stepData.step2) || null}
          {stepData.step2 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Step 2: トレンド評価・角度分析結果
              </h2>
              
              <div className="space-y-4">
                {/* サマリー */}
                {stepData.step2.summary && (
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-orange-900 mb-2">📊 角度分析サマリー</h3>
                    <p className="text-gray-700">{stepData.step2.summary}</p>
                  </div>
                )}
                
                {/* トップ機会 */}
                {(stepData.step2.opportunities || []).length > 0 ? (
                  stepData.step2.opportunities.map((opp: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-lg">{opp.topic}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        予測: {((opp.engagement_prediction || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">コンテンツ角度:</span> {opp.content_angle}
                      </p>
                      <p className="text-gray-600 text-sm mb-1">
                        <span className="font-medium">ターゲット感情:</span> {opp.target_emotion}
                      </p>
                    </div>
                    
                    {/* バイラルパターン認識 */}
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <h4 className="text-sm font-medium mb-2">🔥 バイラルパターン認識:</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">議論性:</span>
                            <span className="font-medium">{(opp.controversy_level * 100).toFixed(0)}%</span>
                          </div>
                          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-400"
                              style={{ width: `${opp.controversy_level * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">感情強度:</span>
                            <span className="font-medium">{(opp.emotion_intensity * 100).toFixed(0)}%</span>
                          </div>
                          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-400"
                              style={{ width: `${opp.emotion_intensity * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">共感性:</span>
                            <span className="font-medium">{(opp.relatability_factor * 100).toFixed(0)}%</span>
                          </div>
                          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400"
                              style={{ width: `${opp.relatability_factor * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">シェア性:</span>
                            <span className="font-medium">{(opp.shareability * 100).toFixed(0)}%</span>
                          </div>
                          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-400"
                              style={{ width: `${opp.shareability * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">投稿推奨時間:</span> {opp.opportunity_window}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      <span className="font-medium">バイラル速度:</span> 
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ml-1 ${
                        opp.viral_velocity === 'explosive' ? 'bg-red-100 text-red-800' :
                        opp.viral_velocity === 'fast' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {opp.viral_velocity === 'explosive' ? '🚀 爆発的' :
                         opp.viral_velocity === 'fast' ? '⚡ 高速' :
                         '🌱 段階的'}
                      </span>
                    </p>
                  </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>角度分析データがありません。APIレスポンスを確認してください。</p>
                    <pre className="mt-4 text-xs text-left bg-gray-100 p-4 rounded overflow-auto">
                      {JSON.stringify(stepData.step2, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 結果 */}
          {stepData.step3 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">💡</span>
                Step 3: コンテンツコンセプト
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stepData.step3.concepts?.map((concept: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        concept.type === 'controversy' ? 'bg-red-100 text-red-800' :
                        concept.type === 'empathy' ? 'bg-purple-100 text-purple-800' :
                        concept.type === 'humor' ? 'bg-yellow-100 text-yellow-800' :
                        concept.type === 'insight' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {concept.type}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold mb-2">{concept.title}</h3>
                    <p className="text-gray-700 text-sm mb-3">
                      <span className="font-medium">フック:</span> {concept.hook}
                    </p>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><span className="font-medium">角度:</span> {concept.angle}</p>
                      <p><span className="font-medium">投稿時間:</span> {concept.timing}</p>
                      <p><span className="font-medium">予想エンゲージメント:</span></p>
                      <div className="ml-2">
                        <p>いいね: {concept.estimatedEngagement?.likes}</p>
                        <p>RT: {concept.estimatedEngagement?.retweets}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-1">
                      {concept.hashtags?.map((tag: string, tagIdx: number) => (
                        <span key={tagIdx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 結果 */}
          {stepData.step4 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">✍️</span>
                Step 4: 完全な投稿コンテンツ
              </h2>
              
              <div className="space-y-6">
                {stepData.step4.fullContents?.map((content: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">コンテンツ {content.conceptNumber}</h3>
                        <span className="text-sm text-gray-600">
                          {content.characterCount}文字
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <pre className="whitespace-pre-wrap text-sm font-sans">
                          {content.fullContent}
                        </pre>
                      </div>
                      
                      <button 
                        onClick={() => navigator.clipboard.writeText(content.fullContent)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        📋 コピー
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">ビジュアル:</span> {content.visualDescription}</p>
                      <p><span className="font-medium">投稿メモ:</span> {content.postingNotes}</p>
                      
                      {content.sourceArticles && content.sourceArticles.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded">
                          <p className="font-medium text-blue-900 mb-2">📰 参照記事（引用ツイート用）:</p>
                          {content.sourceArticles.map((article: any, articleIdx: number) => (
                            <div key={articleIdx} className="mb-2 text-xs">
                              <a href={article.url} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:underline block mb-1">
                                {article.title}
                              </a>
                              {article.quoteTweet && (
                                <div className="ml-4 p-2 bg-white rounded border border-blue-200">
                                  <p className="text-gray-700">{article.quoteTweet}</p>
                                  <button 
                                    onClick={() => navigator.clipboard.writeText(article.quoteTweet)}
                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                  >
                                    コピー
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 結果 */}
          {stepData.step5 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">🚀</span>
                Step 5: 実行戦略
              </h2>
              
              <div className="space-y-4">
                {/* 即時アクション */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">即時アクション (2-4時間)</h3>
                  <ul className="space-y-2">
                    {stepData.step5.executionStrategy?.immediate?.tasks?.map((task: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-sm text-gray-700">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 投稿スケジュール */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">投稿スケジュール</h3>
                  <div className="space-y-2">
                    {stepData.step5.executionStrategy?.postingWindow?.optimalTimes?.map((schedule: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium">コンテンツ {schedule.content}</span>
                        <span className="text-sm text-gray-600">{schedule.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 成功指標 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">成功指標</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">エンゲージメント率</p>
                      <p className="text-lg font-semibold">
                        {stepData.step5.executionStrategy?.successMetrics?.engagementRate?.target}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">予想フォロワー増加</p>
                      <p className="text-lg font-semibold">
                        {stepData.step5.executionStrategy?.successMetrics?.followerGrowth?.expectedRange}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chain of Thought 結果 */}
          {(chainResult || session?.response?.chainHybrid) && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-lg p-6 border border-purple-200">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-purple-900">
                <span className="mr-2">🧠</span>
                Chain of Thought 一括実行結果
              </h2>
              
              {(chainResult?.readyToPost?.status || session?.response?.chainHybrid?.summary?.readyToPost) && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-3">✨ 投稿準備完了コンテンツ</h3>
                  <div className="bg-white rounded-lg p-4 mb-3">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {chainResult?.readyToPost?.content || session?.response?.chainHybrid?.summary?.finalContent || ''}
                    </pre>
                  </div>
                  <div className="flex gap-4 items-center">
                    <button 
                      onClick={() => navigator.clipboard.writeText(chainResult?.readyToPost?.content || session?.response?.chainHybrid?.summary?.finalContent || '')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      📋 コピー
                    </button>
                    <span className="text-sm text-gray-600">
                      推奨投稿時間: {chainResult?.readyToPost?.timing || '2-4時間以内'}
                    </span>
                  </div>
                  {(chainResult?.readyToPost?.hashtags || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(chainResult?.readyToPost?.hashtags || []).map((tag: string, idx: number) => (
                        <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Phase結果サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(chainResult?.phases || session?.response?.chainHybrid?.phases) && Object.entries(chainResult?.phases || session?.response?.chainHybrid?.phases || {}).map(([phase, data]: [string, any]) => (
                    <div key={phase} className="bg-white rounded-lg p-3 border border-purple-200">
                      <h4 className="text-sm font-medium text-purple-900 mb-1">
                        {phase === 'phase1' ? '🔍 Web検索' :
                         phase === 'phase2' ? '📊 トレンド分析' :
                         phase === 'phase3' ? '💡 コンセプト' :
                         phase === 'phase4' ? '✍️ コンテンツ生成' : phase}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {data.trendsFound && `${data.trendsFound}件の記事発見`}
                        {data.bestOpportunity && `最高機会: ${data.bestOpportunity.substring(0, 20)}...`}
                        {data.conceptsGenerated && `${data.conceptsGenerated}個のコンセプト`}
                        {data.contentReady && '✅ 投稿準備完了'}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        実行時間: {data.duration}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 実行戦略 */}
                {(chainResult?.executionStrategy || session?.response?.chainHybrid?.phases?.phase4?.content?.execution_strategy) && (
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <h3 className="font-medium text-purple-900 mb-3">🎯 実行戦略</h3>
                    <div className="space-y-3">
                      {(chainResult?.executionStrategy?.immediate_actions || session?.response?.chainHybrid?.phases?.phase4?.content?.execution_strategy?.immediate_actions) && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">即時アクション:</p>
                          <ul className="mt-1 space-y-1">
                            {(chainResult?.executionStrategy?.immediate_actions || session?.response?.chainHybrid?.phases?.phase4?.content?.execution_strategy?.immediate_actions || []).map((action: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start">
                                <span className="text-purple-500 mr-2">•</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(chainResult?.executionStrategy?.optimization_tips || session?.response?.chainHybrid?.phases?.phase4?.content?.execution_strategy?.optimization_tips) && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">最適化のヒント:</p>
                          <ul className="mt-1 space-y-1">
                            {(chainResult?.executionStrategy?.optimization_tips || session?.response?.chainHybrid?.phases?.phase4?.content?.execution_strategy?.optimization_tips || []).map((tip: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start">
                                <span className="text-blue-500 mr-2">💡</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <Link 
                    href={`/viral/drafts?sessionId=${sessionId}`}
                    className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    生成されたコンテンツを管理 →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Chain Fast 結果 */}
          {(session?.response?.chainFast || session?.metadata?.usedChainFast) && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border border-green-200">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-green-900">
                <span className="mr-2">⚡</span>
                高速生成結果
              </h2>
              
              {session?.response?.chainFast && (
                <div>
                  <div className="mb-6 p-4 bg-white border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-3">🎯 トレンド: {session.response.chainFast.trend_topic}</h3>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm text-gray-600">バイラルスコア:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(session.response.chainFast.viral_score || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{((session.response.chainFast.viral_score || 0) * 100).toFixed(0)}%</span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <pre className="whitespace-pre-wrap text-sm font-sans">
                        {session.response.chainFast.content?.text || ''}
                      </pre>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                      <button 
                        onClick={() => navigator.clipboard.writeText(session.response.chainFast.content?.text || '')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        📋 コピー
                      </button>
                      <span className="text-sm text-gray-600">
                        推奨投稿時間: {session.response.chainFast.content?.optimal_timing || '即時'}
                      </span>
                    </div>
                    
                    {session.response.chainFast.content?.hashtags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {session.response.chainFast.content.hashtags.map((tag: string, idx: number) => (
                          <span key={idx} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {session.response.chainFast.strategy && (
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <h3 className="font-medium text-green-900 mb-3">💡 戦略</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">フック:</span> {session.response.chainFast.strategy.hook}</p>
                        <p><span className="font-medium">エンゲージメントのコツ:</span> {session.response.chainFast.strategy.engagement_tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}