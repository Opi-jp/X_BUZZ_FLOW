'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  CheckCircle, 
  Circle, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  Search,
  Brain,
  Sparkles,
  FileText
} from 'lucide-react'

interface SessionStatus {
  id: string
  theme: string
  platform: string
  style: string
  status: string
  currentPhase: string
  perplexityData: any
  concepts: any[]
  claudeData: any
  error?: string
}

const PHASES = [
  { 
    id: 'CREATED', 
    name: '初期化', 
    description: 'セッションを準備中...',
    icon: Circle
  },
  { 
    id: 'COLLECTING', 
    name: 'トピック収集', 
    description: 'Perplexityで最新情報を収集中...',
    icon: Search
  },
  { 
    id: 'TOPICS_COLLECTED', 
    name: 'コンセプト生成', 
    description: 'GPTでバイラルコンセプトを生成中...',
    icon: Brain
  },
  { 
    id: 'CONCEPTS_GENERATED', 
    name: 'コンセプト選択', 
    description: 'コンセプトの選択待ち...',
    icon: Sparkles
  },
  { 
    id: 'GENERATING_CONTENT', 
    name: '投稿生成', 
    description: 'Claudeで投稿を作成中...',
    icon: FileText
  },
  { 
    id: 'COMPLETED', 
    name: '完了', 
    description: '生成が完了しました！',
    icon: CheckCircle
  }
]

export default function SessionStatusPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<SessionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchSession()
    
    if (autoRefresh) {
      const interval = setInterval(fetchSession, 3000) // 3秒ごとに更新
      return () => clearInterval(interval)
    }
  }, [sessionId, autoRefresh])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/create/flow/list/${sessionId}`)
      if (!response.ok) throw new Error('セッションの取得に失敗しました')
      
      const data = await response.json()
      setSession(data.session)
      
      // フェーズに応じて自動的に次のステップへ
      if (data.session.currentPhase === 'TOPICS_COLLECTED' && !data.session.concepts) {
        // コンセプト生成を開始
        generateConcepts()
      } else if (data.session.currentPhase === 'CONCEPTS_GENERATED' && data.session.concepts) {
        // コンセプト選択ページへリダイレクト
        setAutoRefresh(false)
        router.push(`/generation/content/concept-select/${sessionId}`)
      } else if (data.session.currentPhase === 'COMPLETED') {
        // 結果ページへリダイレクト
        setAutoRefresh(false)
        router.push(`/generation/content/results/${sessionId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const generateConcepts = async () => {
    try {
      const response = await fetch(`/api/create/flow/list/${sessionId}/concepts`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('コンセプト生成の開始に失敗しました')
      }
    } catch (err) {
      console.error('Error generating concepts:', err)
    }
  }

  const getCurrentPhaseIndex = () => {
    if (!session) return -1
    return PHASES.findIndex(p => p.id === session.currentPhase)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold text-red-900">エラー</h3>
          </div>
          <p className="text-red-700">{error || 'セッションが見つかりません'}</p>
          <button
            onClick={() => router.push('/generation/content')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            新しいセッションを開始
          </button>
        </div>
      </div>
    )
  }

  const currentPhaseIndex = getCurrentPhaseIndex()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">生成進行状況</h1>
              <p className="mt-1 text-gray-600">
                テーマ: {session.theme}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">セッションID</p>
              <p className="font-mono text-xs text-gray-600">{sessionId}</p>
            </div>
          </div>
        </div>

        {/* 進行状況 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-8">
            {PHASES.map((phase, index) => {
              const isCompleted = index < currentPhaseIndex
              const isCurrent = index === currentPhaseIndex
              const isPending = index > currentPhaseIndex
              const Icon = phase.icon
              
              return (
                <div key={phase.id} className="relative">
                  {index < PHASES.length - 1 && (
                    <div className={`absolute left-5 top-10 w-0.5 h-16 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-500' :
                      isCurrent ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : isCurrent ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Icon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        isCompleted ? 'text-green-700' :
                        isCurrent ? 'text-blue-700' :
                        'text-gray-500'
                      }`}>
                        {phase.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {phase.description}
                      </p>
                      
                      {/* フェーズ固有の情報表示 */}
                      {phase.id === 'TOPICS_COLLECTED' && session.perplexityData && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {session.perplexityData.length}個のトピックを収集しました
                          </p>
                        </div>
                      )}
                      
                      {phase.id === 'CONCEPTS_GENERATED' && session.concepts && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {session.concepts.length}個のコンセプトを生成しました
                          </p>
                        </div>
                      )}
                      
                      {phase.id === 'COMPLETED' && session.claudeData && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-700">
                            投稿の生成が完了しました！
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* セッション情報 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">プラットフォーム:</span>
              <span className="ml-2 font-medium">{session.platform}</span>
            </div>
            <div>
              <span className="text-gray-600">スタイル:</span>
              <span className="ml-2 font-medium">{session.style}</span>
            </div>
            <div>
              <span className="text-gray-600">ステータス:</span>
              <span className="ml-2 font-medium">{session.status}</span>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {session.error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">エラーが発生しました</h4>
                <p className="mt-1 text-sm text-red-700">{session.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}