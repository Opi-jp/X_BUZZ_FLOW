'use client'

import { useState } from 'react'

interface Phase1Data {
  dataCollection: {
    news: any
    buzzPosts: any
    dataQuality: any
    readyForAnalysis: boolean
  }
}

interface Phase2Data {
  trends: any[]
  analysis: any
  summary: string
}

interface Phase3Data {
  results: any[]
  analysis: any
}

interface Phase4Data {
  strategy: any
  executionPlans: any[]
  analysis: any
}

export default function EnhancedViralAnalysis() {
  const [currentPhase, setCurrentPhase] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [phase1Data, setPhase1Data] = useState<Phase1Data | null>(null)
  const [phase2Data, setPhase2Data] = useState<Phase2Data | null>(null)
  const [phase3Data, setPhase3Data] = useState<Phase3Data | null>(null)
  const [phase4Data, setPhase4Data] = useState<Phase4Data | null>(null)

  const [selectedTrends, setSelectedTrends] = useState<string[]>([])
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([])

  const runPhase1 = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/viral/analysis/phase1-data-collection')
      
      if (!response.ok) {
        throw new Error(`Phase 1 エラー: ${response.status}`)
      }

      const data = await response.json()
      setPhase1Data(data)
      
      if (data.dataCollection.readyForAnalysis) {
        setCurrentPhase(2)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phase 1でエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const runPhase2 = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/viral/analysis/phase2-trend-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minImportance: 0.7,
          maxTrends: 10
        })
      })

      if (!response.ok) {
        throw new Error(`Phase 2 エラー: ${response.status}`)
      }

      const data = await response.json()
      setPhase2Data(data)
      setCurrentPhase(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phase 2でエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const runPhase3 = async () => {
    if (selectedTrends.length === 0) {
      setError('トレンドを選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/viral/analysis/phase3-content-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendIds: selectedTrends,
          conceptsPerTrend: 3
        })
      })

      if (!response.ok) {
        throw new Error(`Phase 3 エラー: ${response.status}`)
      }

      const data = await response.json()
      setPhase3Data(data)
      setCurrentPhase(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phase 3でエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const runPhase4 = async () => {
    if (selectedConcepts.length === 0) {
      setError('コンセプトを選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/viral/analysis/phase4-execution-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptIds: selectedConcepts,
          autoSchedule: false
        })
      })

      if (!response.ok) {
        throw new Error(`Phase 4 エラー: ${response.status}`)
      }

      const data = await response.json()
      setPhase4Data(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Phase 4でエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const resetAnalysis = () => {
    setCurrentPhase(1)
    setPhase1Data(null)
    setPhase2Data(null)
    setPhase3Data(null)
    setPhase4Data(null)
    setSelectedTrends([])
    setSelectedConcepts([])
    setError(null)
  }

  const phaseActions = [
    { phase: 1, title: 'Phase 1: データ収集', action: runPhase1, color: 'blue' },
    { phase: 2, title: 'Phase 2: トレンド評価', action: runPhase2, color: 'green' },
    { phase: 3, title: 'Phase 3: コンテンツコンセプト', action: runPhase3, color: 'purple' },
    { phase: 4, title: 'Phase 4: 実行戦略', action: runPhase4, color: 'orange' },
  ]

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">拡張バイラル分析システム</h1>
        <button
          onClick={resetAnalysis}
          className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
        >
          リセット
        </button>
      </div>

      {/* プログレスインジケーター */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {phaseActions.map((phaseAction) => (
            <div
              key={phaseAction.phase}
              className={`flex-1 text-center py-2 mx-1 rounded ${
                currentPhase === phaseAction.phase
                  ? `bg-${phaseAction.color}-500 text-white`
                  : currentPhase > phaseAction.phase
                  ? `bg-${phaseAction.color}-200 text-${phaseAction.color}-800`
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              <div className="text-sm font-medium">{phaseAction.title}</div>
              {currentPhase > phaseAction.phase && <div className="text-xs">✓ 完了</div>}
            </div>
          ))}
        </div>
      </div>

      {/* フェーズ実行ボタン */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {phaseActions.map((phaseAction) => (
          <button
            key={phaseAction.phase}
            onClick={phaseAction.action}
            disabled={loading || currentPhase !== phaseAction.phase}
            className={`px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              currentPhase === phaseAction.phase
                ? `bg-${phaseAction.color}-500 text-white hover:bg-${phaseAction.color}-600`
                : currentPhase > phaseAction.phase
                ? `bg-${phaseAction.color}-200 text-${phaseAction.color}-800`
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            {loading && currentPhase === phaseAction.phase
              ? '実行中...'
              : `${phaseAction.title}実行`
            }
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Phase 1 結果 */}
      {phase1Data && (
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Phase 1: データ収集結果</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded">
              <h3 className="font-semibold mb-2">ニュース収集状況</h3>
              <p>総記事数（24時間）: {phase1Data.dataCollection.news.total24h}件</p>
              <p>品質スコア: {phase1Data.dataCollection.news.qualityScore}</p>
            </div>
            <div className="bg-white p-4 rounded">
              <h3 className="font-semibold mb-2">バズ投稿収集状況</h3>
              <p>総投稿数（3時間）: {phase1Data.dataCollection.buzzPosts.total3h}件</p>
              <p>高エンゲージメント: {phase1Data.dataCollection.buzzPosts.highEngagement}件</p>
            </div>
          </div>
          
          <div className={`p-3 rounded ${
            phase1Data.dataCollection.readyForAnalysis 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {phase1Data.dataCollection.readyForAnalysis 
              ? '✓ 分析準備完了' 
              : '⚠ データ収集が不十分です'
            }
          </div>
        </div>
      )}

      {/* Phase 2 結果 */}
      {phase2Data && (
        <div className="bg-green-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Phase 2: トレンド評価結果</h2>
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">{phase2Data.summary}</p>
            <p className="text-sm text-gray-600">
              分析ニュース: {phase2Data.analysis.newsAnalyzed}件 | 
              分析投稿: {phase2Data.analysis.postsAnalyzed}件 | 
              発見トレンド: {phase2Data.analysis.trendsIdentified}件
            </p>
          </div>

          <div className="space-y-4">
            {phase2Data.trends.map((trend, index) => (
              <div key={trend.id} className="bg-white p-4 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTrends.includes(trend.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTrends([...selectedTrends, trend.id])
                        } else {
                          setSelectedTrends(selectedTrends.filter(id => id !== trend.id))
                        }
                      }}
                      className="mr-2"
                    />
                    <h3 className="font-semibold">{trend.topic}</h3>
                  </label>
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    スコア: {(trend.viralScore * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{trend.angle}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {trend.keywords?.map((keyword: string, i: number) => (
                    <span key={i} className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {keyword}
                    </span>
                  ))}
                </div>
                {trend.sourceData && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-500">
                      ソース詳細を表示
                    </summary>
                    <div className="mt-2 text-xs">
                      <div className="mb-2">
                        <strong>関連ニュース:</strong>
                        <ul className="list-disc list-inside">
                          {trend.sourceData.relatedNews?.map((news: string, i: number) => (
                            <li key={i}>{news}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>関連投稿:</strong>
                        <ul className="list-disc list-inside">
                          {trend.sourceData.relatedPosts?.map((post: string, i: number) => (
                            <li key={i}>{post}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>

          {selectedTrends.length > 0 && (
            <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
              {selectedTrends.length}件のトレンドが選択されています
            </div>
          )}
        </div>
      )}

      {/* Phase 3 結果 */}
      {phase3Data && (
        <div className="bg-purple-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">💡 Phase 3: コンテンツコンセプト結果</h2>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              処理トレンド: {phase3Data.analysis.trendsProcessed}件 | 
              生成コンセプト: {phase3Data.analysis.conceptsGenerated}件
            </p>
          </div>

          <div className="space-y-6">
            {phase3Data.results.map((result, trendIndex) => (
              <div key={trendIndex} className="bg-white p-4 rounded border">
                <h3 className="font-semibold mb-4">{result.trend.topic}</h3>
                
                <div className="space-y-4">
                  {result.concepts.map((concept: any, conceptIndex: number) => (
                    <div key={concept.id} className="border-l-4 border-purple-300 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedConcepts.includes(concept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedConcepts([...selectedConcepts, concept.id])
                              } else {
                                setSelectedConcepts(selectedConcepts.filter(id => id !== concept.id))
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="font-medium">
                            {concept.metadata?.title || `コンセプト ${conceptIndex + 1}`}
                          </span>
                        </label>
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          {concept.postType}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-2">{concept.content}</p>
                      
                      {concept.threadContent && (
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>スレッド:</strong> {concept.threadContent.length}投稿
                        </div>
                      )}
                      
                      {concept.hashtags && concept.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {concept.hashtags.map((tag: string, i: number) => (
                            <span key={i} className="text-sm text-blue-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedConcepts.length > 0 && (
            <div className="mt-4 p-3 bg-purple-100 text-purple-800 rounded">
              {selectedConcepts.length}件のコンセプトが選択されています
            </div>
          )}
        </div>
      )}

      {/* Phase 4 結果 */}
      {phase4Data && (
        <div className="bg-orange-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">🚀 Phase 4: 実行戦略結果</h2>
          
          <div className="mb-6">
            <div className="bg-white p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">戦略概要</h3>
              <p><strong>テーマ:</strong> {phase4Data.strategy.overview?.strategyTheme}</p>
              <p><strong>実行期間:</strong> {phase4Data.strategy.overview?.executionWindow}</p>
              <p><strong>成功要因:</strong> {phase4Data.strategy.overview?.successFactors?.join(', ')}</p>
            </div>

            <div className="bg-white p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">タイミング戦略</h3>
              <p><strong>最適時間帯:</strong> {phase4Data.strategy.globalTiming?.peakHours?.join(', ')}</p>
              <p><strong>避ける時間:</strong> {phase4Data.strategy.globalTiming?.avoidHours?.join(', ')}</p>
              <p><strong>投稿間隔:</strong> {phase4Data.strategy.globalTiming?.intervalStrategy}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">実行プラン詳細</h3>
            {phase4Data.executionPlans.map((plan: any, index: number) => (
              <div key={index} className="bg-white p-4 rounded border">
                <div className="mb-4">
                  <h4 className="font-medium mb-2">
                    {plan.concept.metadata?.title || `プラン ${index + 1}`}
                  </h4>
                  <p className="text-sm text-gray-600">
                    投稿予定: {new Date(plan.executionPlan.strategy.optimalPostTime).toLocaleString('ja-JP')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h5 className="text-sm font-medium mb-1">KPI目標</h5>
                    <div className="text-xs text-gray-600">
                      <p>いいね: {plan.executionPlan.kpiTargets.likes}</p>
                      <p>RT: {plan.executionPlan.kpiTargets.retweets}</p>
                      <p>リプ: {plan.executionPlan.kpiTargets.replies}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium mb-1">リスクレベル</h5>
                    <span className={`text-xs px-2 py-1 rounded ${
                      plan.executionPlan.riskAssessment.riskLevel === 'low'
                        ? 'bg-green-100 text-green-800'
                        : plan.executionPlan.riskAssessment.riskLevel === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.executionPlan.riskAssessment.riskLevel}
                    </span>
                  </div>
                </div>

                <details>
                  <summary className="cursor-pointer text-sm text-gray-500">
                    タイムライン詳細 ({plan.executionPlan.timeline.tasks.length}タスク)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {plan.executionPlan.timeline.tasks.map((task: any, taskIndex: number) => (
                      <div key={taskIndex} className="text-xs bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{task.type}</span>
                          <span>{new Date(task.scheduledAt).toLocaleString('ja-JP')}</span>
                        </div>
                        <p className="text-gray-600">{task.content}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}