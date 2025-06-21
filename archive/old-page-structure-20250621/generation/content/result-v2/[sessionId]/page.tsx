'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { 
  CheckCircle, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  FileText,
  TrendingUp,
  Target,
  Edit,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  ExternalLink
} from 'lucide-react'

interface PhaseResult {
  think?: any
  execute?: any
  integrate?: any
}

interface Session {
  id: string
  status: string
  config: any
  currentPhase: number
  currentStep: string
  phaseResults: {
    phase1?: PhaseResult
    phase2?: PhaseResult
    phase3?: PhaseResult
    phase4?: PhaseResult
    phase5?: PhaseResult
  }
  drafts: any[]
  createdAt: string
  completedAt?: string
  totalTokens: number
  totalDuration: number
}

const phaseIcons = {
  1: TrendingUp,
  2: Target,
  3: FileText,
  4: Edit,
  5: Clock
}

const phaseNames = {
  1: '情報収集・トレンド分析',
  2: '機会評価・選定',
  3: 'コンセプト生成',
  4: 'コンテンツ作成',
  5: '投稿戦略策定'
}

export default function CotResultV2Page({ 
  params 
}: { 
  params: Promise<{ sessionId: string }> 
}) {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([1]))
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    params.then(p => setSessionId(p.sessionId))
  }, [params])

  useEffect(() => {
    if (sessionId) {
      fetchSession()
      // 定期的に更新（処理中の場合のみ）
      const interval = setInterval(() => {
        // PENDINGステータスの場合は自動更新しない（ユーザー確認待ち）
        if (session && ['THINKING', 'EXECUTING', 'INTEGRATING'].includes(session.status)) {
          fetchSession()
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [sessionId, session?.status])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}`)
      if (!response.ok) throw new Error('Session not found')
      const data = await response.json()
      setSession(data)
      
      // 完了したフェーズを自動的に展開
      const completed = new Set<number>()
      for (let i = 1; i <= 5; i++) {
        if (data.phaseResults[`phase${i}`]?.integrate) {
          completed.add(i)
        }
      }
      setExpandedPhases(completed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleNextPhase = async () => {
    if (!session || isProcessing) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('処理に失敗しました')
      }
      
      const data = await response.json()
      
      // フェーズが完了し、ユーザー確認が必要な場合
      if (data.phaseCompleted && data.nextAction?.waitForUser) {
        // 処理を停止し、セッションを更新
        await fetchSession()
        setIsProcessing(false)
        return
      }
      
      // セッションを再取得
      await fetchSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : '処理エラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const togglePhase = (phase: number) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phase)) {
      newExpanded.delete(phase)
    } else {
      newExpanded.add(phase)
    }
    setExpandedPhases(newExpanded)
  }

  const getPhaseStatus = (phase: number) => {
    if (!session) return 'pending'
    
    if (session.phaseResults[`phase${phase}`]?.integrate) {
      return 'completed'
    } else if (session.currentPhase === phase) {
      return 'running'
    } else if (session.currentPhase > phase) {
      return 'completed'
    }
    return 'pending'
  }

  const renderPhaseResult = (phase: number) => {
    const phaseData = session?.phaseResults[`phase${phase}`]
    if (!phaseData) return null

    const integrateResult = phaseData.integrate?.result

    switch (phase) {
      case 1:
        return renderPhase1Result(integrateResult)
      case 2:
        return renderPhase2Result(integrateResult)
      case 3:
        return renderPhase3Result(integrateResult)
      case 4:
        return renderPhase4Result(integrateResult)
      case 5:
        return renderPhase5Result(integrateResult)
      default:
        return null
    }
  }

  const renderPhase1Result = (result: any) => {
    if (!result) return null
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">発見されたトレンド</h4>
          <div className="space-y-4">
            {result.extractedTopics?.map((topic: any, idx: number) => (
              <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">{topic.topicName}</h5>
                <p className="text-sm text-gray-600 mb-2">{topic.summary}</p>
                
                <div className="mb-3">
                  <span className="text-xs font-medium text-gray-500">バズ要素:</span>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {topic.buzzElements?.emotionalTrigger}
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      論争性: {topic.buzzElements?.controversyLevel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Object.entries(topic.viralScores || {}).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-xs text-gray-500">{key}</div>
                      <div className="text-sm font-medium">{(value as number).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-500">
                  ソース: 
                  {topic.sources?.map((source: any, i: number) => (
                    <a 
                      key={i}
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2"
                    >
                      {source.title}
                      <ExternalLink className="w-3 h-3 inline ml-1" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>分析結果:</strong> {result.analysisInsights}
          </p>
        </div>
      </div>
    )
  }

  const renderPhase2Result = (result: any) => {
    if (!result) return null
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">選定された機会</h4>
          <div className="space-y-3">
            {result.selectedOpportunities?.map((opp: any, idx: number) => (
              <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-gray-900">{opp.name}</h5>
                  <span className="text-sm bg-green-600 text-white px-2 py-1 rounded">
                    優先度 {opp.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{opp.reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <strong>総合インサイト:</strong> {result.insights}
        </div>
      </div>
    )
  }

  const renderPhase3Result = (result: any) => {
    if (!result) return null
    
    return (
      <div className="space-y-6">
        <h4 className="font-semibold text-gray-900 mb-3">生成されたコンセプト</h4>
        {result.concepts?.map((concept: any, idx: number) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h5 className="font-medium text-gray-900">
                コンセプト {concept.number}: {concept.title}
              </h5>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {concept.format}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">フック:</span>
                <p className="text-gray-600 mt-1">{concept.hook}</p>
              </div>

              <div>
                <span className="font-medium text-gray-700">アングル:</span>
                <p className="text-gray-600">{concept.angle}</p>
              </div>

              <div>
                <span className="font-medium text-gray-700">期待される反応:</span>
                <p className="text-gray-600">{concept.expectedReaction}</p>
              </div>

              {concept.sourceUrl && (
                <div className="text-xs">
                  <a 
                    href={concept.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    参考記事を見る
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderPhase4Result = (result: any) => {
    if (!result) return null
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">作成されたコンテンツ</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="whitespace-pre-wrap text-gray-800">{result.mainPost}</p>
          </div>
        </div>

        {result.threadPosts?.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-900 mb-2">スレッド続き</h5>
            <div className="space-y-2">
              {result.threadPosts.map((post: string, idx: number) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-500">スレッド {idx + 2}</span>
                  <p className="text-sm text-gray-800 mt-1">{post}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.hashtags?.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-900 mb-2">ハッシュタグ</h5>
            <div className="flex flex-wrap gap-2">
              {result.hashtags.map((tag: string, idx: number) => (
                <span key={idx} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <strong>投稿時の注意:</strong> {result.postingNote}
        </div>
      </div>
    )
  }

  const renderPhase5Result = (result: any) => {
    if (!result) return null
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">投稿タイミング</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">推奨時刻:</span>
                <div className="mt-1">
                  {result.bestTimeToPost?.map((time: string, idx: number) => (
                    <div key={idx} className="text-sm text-gray-600">• {time}</div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">期待エンゲージメント:</span>
                <p className="text-sm text-gray-600 mt-1">{result.expectedEngagement}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">KPI目標</h4>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(result.kpis?.targets || {}).map(([time, targets]: [string, any]) => (
              <div key={time} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{time}</div>
                <div className="text-sm">
                  <div>インプレ: {targets.impressions}</div>
                  <div>エンゲージ: {targets.engagement}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">フォローアップ戦略</h4>
          <p className="text-sm text-gray-600">{result.followUpStrategy}</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">実行計画</h4>
          <div className="space-y-2">
            {result.executionPlan?.immediateActions?.map((action: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <div className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                  {action.time}
                </div>
                <div>
                  <p className="text-gray-800">{action.action}</p>
                  <p className="text-xs text-gray-500">{action.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AppLayout>
    )
  }

  if (error || !session) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-800">{error || 'セッションが見つかりません'}</p>
            <button
              onClick={() => router.push('/viral/cot')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              戻る
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const isProcessingNow = ['THINKING', 'EXECUTING', 'INTEGRATING'].includes(session.status)
  const isCompleted = session.status === 'COMPLETED'
  const canProceed = !isProcessingNow && !isCompleted && session.currentPhase <= 5

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Chain of Thought 分析レポート</h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">分野:</span> {session.config.expertise}
            </div>
            <div>
              <span className="font-medium">プラットフォーム:</span> {session.config.platform}
            </div>
            <div>
              <span className="font-medium">スタイル:</span> {session.config.style}
            </div>
            {session.completedAt && (
              <div>
                <span className="font-medium">完了時間:</span> {Math.round(session.totalDuration / 1000)}秒
              </div>
            )}
          </div>
        </div>

        {/* 現在の状態表示 */}
        {isProcessingNow && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-3" />
              <span className="text-blue-800">
                Phase {session.currentPhase} - {session.currentStep} を処理中...
              </span>
            </div>
          </div>
        )}

        {/* 各フェーズの結果 */}
        <div className="space-y-4 mb-8">
          {[1, 2, 3, 4, 5].map(phase => {
            const status = getPhaseStatus(phase)
            const Icon = phaseIcons[phase]
            const isExpanded = expandedPhases.has(phase)
            
            return (
              <div 
                key={phase}
                className={`border rounded-lg overflow-hidden transition-all ${
                  status === 'completed' ? 'border-green-300 bg-green-50/30' :
                  status === 'running' ? 'border-blue-300 bg-blue-50/30' :
                  'border-gray-200 bg-gray-50/30'
                }`}
              >
                <button
                  onClick={() => togglePhase(phase)}
                  disabled={status === 'pending'}
                  className={`w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-50 transition-colors ${
                    status === 'pending' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className={`w-6 h-6 mr-3 ${
                      status === 'completed' ? 'text-green-600' :
                      status === 'running' ? 'text-blue-600' :
                      'text-gray-400'
                    }`} />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">
                        Phase {phase}: {phaseNames[phase]}
                      </h3>
                      {status === 'running' && (
                        <p className="text-sm text-blue-600 mt-1">処理中...</p>
                      )}
                      {status === 'completed' && (
                        <p className="text-sm text-green-600 mt-1">完了</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    )}
                    {status === 'running' && (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                    )}
                    {status !== 'pending' && (
                      isExpanded ? 
                        <ChevronUp className="w-5 h-5 text-gray-500" /> : 
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {isExpanded && status !== 'pending' && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    {renderPhaseResult(phase)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* アクションボタン */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/viral/cot')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            新規生成
          </button>

          <div className="flex gap-4">
            {canProceed && (
              <button
                onClick={handleNextPhase}
                disabled={isProcessing}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    次のステップへ進む
                  </>
                )}
              </button>
            )}

            {isCompleted && session.drafts.length > 0 && (
              <button
                onClick={() => router.push(`/viral/drafts?sessionId=${sessionId}`)}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
              >
                <Edit className="w-5 h-5 mr-2" />
                下書きを編集
              </button>
            )}
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}