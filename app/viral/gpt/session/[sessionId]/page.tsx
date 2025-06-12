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

  useEffect(() => {
    fetchSession()
  }, [sessionId])

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
    try {
      const response = await fetch(`/api/viral/gpt-session/${sessionId}/step${step}`, {
        method: 'POST'
      })

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
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
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
              <button
                onClick={() => executeStep(currentStep)}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? '実行中...' : currentStep === 1 ? '分析を開始' : '続行'}
              </button>
              
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

          {session.metadata?.completed && (
            <div className="mt-8 text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">✅ すべての分析が完了しました</p>
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
                {(stepData.step2.topOpportunities || stepData.step2.analysis?.topOpportunities || []).length > 0 ? (
                  (stepData.step2.topOpportunities || stepData.step2.analysis?.topOpportunities).map((opp: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-lg">{opp.topic}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        スコア: {((opp.viralScore || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="text-gray-700 mb-2">
                        <span className="font-medium">最適な角度:</span> {opp.bestAngle}
                      </p>
                      <p className="text-gray-600 text-sm mb-1">
                        <span className="font-medium">なぜこの角度か:</span> {opp.angleReasoning}
                      </p>
                    </div>
                    
                    {/* コンテンツ角度の詳細 */}
                    {opp.contentAngles && (
                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <h4 className="text-sm font-medium mb-2">コンテンツ角度の提案:</h4>
                        <ul className="space-y-1 text-sm">
                          {opp.contentAngles.map((angle: any, angleIdx: number) => (
                            <li key={angleIdx} className="flex items-start">
                              <span className="text-gray-500 mr-2">•</span>
                              <div>
                                <span className="font-medium">{angle.type}:</span> {angle.description}
                                {angle.expectedEngagement && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    (期待エンゲージメント: {angle.expectedEngagement})
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">投稿推奨時間:</span> {opp.timeWindow}
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      <span className="font-medium">推奨事項:</span> {opp.specificRecommendation}
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
        </div>
      </div>
    </div>
  )
}