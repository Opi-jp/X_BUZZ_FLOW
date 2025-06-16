'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PhaseProgressV2 from './PhaseProgressV2'
import PhaseResult from './PhaseResult'
import { RefreshCw, PlayCircle, AlertCircle } from 'lucide-react'

interface SessionStatusProps {
  sessionId: string
}

interface SessionData {
  id: string
  theme: string
  style: string
  platform: string
  status: 'PENDING' | 'THINKING' | 'EXECUTING' | 'INTEGRATING' | 'COMPLETED' | 'ERROR'
  currentPhase: number
  currentStep: 'THINK' | 'EXECUTE' | 'INTEGRATE'
  phases?: PhaseData[]
  createdAt: string
  updatedAt: string
}

interface PhaseData {
  number: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  thinkResult?: any
  executeResult?: any
  integrateResult?: any
  error?: string
}

export default function SessionStatus({ sessionId }: SessionStatusProps) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [processingPhase, setProcessingPhase] = useState<number | null>(null)

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}`)
      if (!response.ok) {
        throw new Error('セッション情報の取得に失敗しました')
      }
      const data = await response.json()
      setSession(data.session || data)
      setError(null)
      
      // 完了時の処理
      if ((data.session?.status || data.status) === 'COMPLETED') {
        console.log('CoT processing completed')
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

  const handleProceedToNextPhase = async (nextPhase: number) => {
    if (processingPhase) return // 既に処理中の場合はブロック

    const confirmed = window.confirm(`Phase ${nextPhase}に進みますか？\n\n注意: この操作は元に戻せません。`)
    if (!confirmed) return

    try {
      setProcessingPhase(nextPhase)
      setError(null)

      const response = await fetch(`/api/viral/cot-session/${sessionId}/proceed-next-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPhase: nextPhase })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'フェーズ進行に失敗しました')
      }

      // 成功後、すぐにセッション情報を更新
      await fetchSession()
      setIsPolling(true) // ポーリング再開
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フェーズ進行中にエラーが発生しました')
    } finally {
      setProcessingPhase(null)
    }
  }

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  // 動的ポーリング制御
  useEffect(() => {
    if (!session) return

    const shouldPoll = session.status !== 'COMPLETED' && session.status !== 'ERROR'
    
    if (shouldPoll || isPolling) {
      // 状態に応じたポーリング間隔
      const getPollingInterval = () => {
        if (session.status === 'THINKING' || session.status === 'EXECUTING') return 2000 // 2秒
        if (session.status === 'INTEGRATING') return 3000 // 3秒
        return 5000 // 5秒（待機状態）
      }

      const interval = setInterval(fetchSession, getPollingInterval())
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

  // フェーズデータの準備（PhaseProgressV2用）
  const phases: PhaseData[] = session.phases || []
  
  // 初期状態（PENDING）の場合、Phase 1の初期データを作成
  if (session.status === 'PENDING' && phases.length === 0) {
    phases.push({
      number: 1,
      status: 'pending',
      thinkResult: null,
      executeResult: null,
      integrateResult: null
    })
  }
  
  // 古い形式のデータがある場合は変換（後方互換性）
  const completedPhases = []
  if ((session as any).phase1Results) completedPhases.push({ phase: 1, data: (session as any).phase1Results })
  if ((session as any).phase2Results) completedPhases.push({ phase: 2, data: (session as any).phase2Results })
  if ((session as any).phase3Results) completedPhases.push({ phase: 3, data: (session as any).phase3Results })
  if ((session as any).phase4Results) completedPhases.push({ phase: 4, data: (session as any).phase4Results })
  if ((session as any).phase5Results) completedPhases.push({ phase: 5, data: (session as any).phase5Results })

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
      <PhaseProgressV2
        currentPhase={session.currentPhase}
        currentStep={session.currentStep}
        status={session.status}
        phases={phases}
        onProceedToNextPhase={handleProceedToNextPhase}
      />

      {/* 手動進行の状態表示 */}
      {processingPhase && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="text-blue-800 font-medium">
              Phase {processingPhase}への進行中...
            </span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            しばらくお待ちください。処理には数分かかる場合があります。
          </p>
        </div>
      )}

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
            <PhaseResult 
              key={phase} 
              phase={phase} 
              data={data} 
              onProceedToNextPhase={handleProceedToNextPhase}
            />
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