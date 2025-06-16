'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PhaseProgress from './PhaseProgress'
import PhaseResult from './PhaseResult'
import { RefreshCw } from 'lucide-react'

interface SessionStatusProps {
  sessionId: string
  onComplete?: () => void
}

interface SessionData {
  id: string
  theme: string
  style: string
  platform: string
  status: 'PENDING' | 'THINKING' | 'EXECUTING' | 'INTEGRATING' | 'COMPLETED' | 'ERROR'
  currentPhase: number
  currentStep: 'THINK' | 'EXECUTE' | 'INTEGRATE'
  phase1Results?: any
  phase2Results?: any
  phase3Results?: any
  phase4Results?: any
  phase5Results?: any
  createdAt: string
  updatedAt: string
}

export default function SessionStatus({ sessionId, onComplete }: SessionStatusProps) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}`)
      if (!response.ok) {
        throw new Error('セッション情報の取得に失敗しました')
      }
      const data = await response.json()
      setSession(data.session || data)
      setError(null)
      
      // 完了時のコールバック
      if ((data.session?.status || data.status) === 'COMPLETED' && onComplete) {
        onComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const startProcessing = async () => {
    try {
      setIsPolling(true)
      const response = await fetch(`/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error('処理開始に失敗しました')
      }
      // 処理開始後、すぐにポーリング開始
      await fetchSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsPolling(false)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  // ポーリング制御
  useEffect(() => {
    if (!session) return

    const shouldPoll = session.status !== 'COMPLETED' && session.status !== 'ERROR'
    
    if (shouldPoll || isPolling) {
      const interval = setInterval(fetchSession, 3000) // 3秒ごと
      return () => clearInterval(interval)
    }
  }, [session?.status, isPolling])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">セッション情報を読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-medium mb-2">エラーが発生しました</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchSession}
          className="flex items-center px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          再試行
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">セッションが見つかりません。</p>
      </div>
    )
  }

  const completedPhases = []
  if (session.phase1Results) completedPhases.push({ phase: 1, data: session.phase1Results })
  if (session.phase2Results) completedPhases.push({ phase: 2, data: session.phase2Results })
  if (session.phase3Results) completedPhases.push({ phase: 3, data: session.phase3Results })
  if (session.phase4Results) completedPhases.push({ phase: 4, data: session.phase4Results })
  if (session.phase5Results) completedPhases.push({ phase: 5, data: session.phase5Results })

  return (
    <div className="space-y-6">
      {/* セッション情報 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Chain of Thought セッション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">発信テーマ:</span>
            <p className="font-medium">{session.theme}</p>
          </div>
          <div>
            <span className="text-gray-500">スタイル:</span>
            <p className="font-medium">{session.style}</p>
          </div>
          <div>
            <span className="text-gray-500">プラットフォーム:</span>
            <p className="font-medium">{session.platform}</p>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>作成: {new Date(session.createdAt).toLocaleString('ja-JP')}</p>
          <p>更新: {new Date(session.updatedAt).toLocaleString('ja-JP')}</p>
        </div>
      </div>

      {/* 進行状況 */}
      <PhaseProgress
        currentPhase={session.currentPhase}
        currentStep={session.currentStep}
        status={session.status}
      />

      {/* 処理開始ボタン */}
      {session.status === 'PENDING' && (
        <div className="text-center">
          <button
            onClick={startProcessing}
            disabled={isPolling}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPolling ? '処理中...' : 'Chain of Thought処理を開始'}
          </button>
        </div>
      )}

      {/* フェーズ結果表示 */}
      {completedPhases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">処理結果</h3>
          {completedPhases.map(({ phase, data }) => (
            <PhaseResult key={phase} phase={phase} data={data} />
          ))}
        </div>
      )}

      {/* 完了時のアクション */}
      {session.status === 'COMPLETED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-green-800 font-medium mb-2">✅ 処理完了</h3>
          <p className="text-green-700 mb-4">
            Chain of Thought処理が完了しました。下書きが生成されています。
          </p>
          <div className="flex space-x-4">
            <Link
              href="/viral/drafts"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              下書きを確認
            </Link>
            <Link
              href="/viral/cot"
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              新しいセッションを開始
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}