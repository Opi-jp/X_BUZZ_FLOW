import { useState, useEffect, useCallback } from 'react'
import { ViralSessionDB } from '@/lib/flow/db-types'
import { ClaudeLogger } from '@/lib/core/claude-logger'

interface UseDBFlowSessionReturn {
  session: ViralSessionDB | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  updateSession: (updates: Partial<ViralSessionDB>) => Promise<void>
}

/**
 * DB主導のセッション管理フック
 * LocalStorageを使用せず、常にDBから最新状態を取得
 */
export function useDBFlowSession(sessionId: string): UseDBFlowSessionReturn {
  const [session, setSession] = useState<ViralSessionDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // セッション情報の取得
  const fetchSession = useCallback(async () => {
    if (!sessionId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/create/flow/${sessionId}/status`)
      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`)
      }

      const data = await response.json()
      setSession(data.session)
      
      ClaudeLogger.info(
        { module: 'frontend', operation: 'fetch-session', sessionId },
        'Session fetched from DB',
        {
          status: data.session.status,
          currentStep: data.session.current_step
        }
      )
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      ClaudeLogger.error(
        { module: 'frontend', operation: 'fetch-session', sessionId },
        'Failed to fetch session',
        error
      )
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // セッション情報の更新（DBのみ、LocalStorage不使用）
  const updateSession = useCallback(async (updates: Partial<ViralSessionDB>) => {
    if (!sessionId) return

    try {
      setError(null)

      const response = await fetch(`/api/create/flow/${sessionId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.statusText}`)
      }

      const data = await response.json()
      setSession(data.session)

      ClaudeLogger.info(
        { module: 'frontend', operation: 'update-session', sessionId },
        'Session updated in DB',
        {
          updates,
          newStatus: data.session.status
        }
      )
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      ClaudeLogger.error(
        { module: 'frontend', operation: 'update-session', sessionId },
        'Failed to update session',
        error
      )
      throw error
    }
  }, [sessionId])

  // 初回ロード
  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // ポーリングまたはSSEでリアルタイム更新（後で実装）
  useEffect(() => {
    if (!sessionId || !session) return

    // 処理中のステータスの場合は定期的に更新をチェック
    const processingStatuses = ['COLLECTING', 'GENERATING_CONCEPTS', 'GENERATING_CONTENT']
    if (processingStatuses.includes(session.status)) {
      const interval = setInterval(fetchSession, 3000) // 3秒ごと
      return () => clearInterval(interval)
    }
  }, [sessionId, session?.status, fetchSession])

  return {
    session,
    loading,
    error,
    refresh: fetchSession,
    updateSession
  }
}

/**
 * 現在のステップデータを取得するヘルパー関数
 */
export function getCurrentStepData(session: ViralSessionDB | null) {
  if (!session) return null

  // ステータスに基づいて現在のステップを判定
  const statusToStep: Record<string, string> = {
    'CREATED': 'input',
    'COLLECTING': 'collecting',
    'TOPICS_COLLECTED': 'topics',
    'GENERATING_CONCEPTS': 'generating_concepts',
    'CONCEPTS_GENERATED': 'concepts',
    'GENERATING_CONTENT': 'generating_content',
    'CONTENTS_GENERATED': 'content',
    'COMPLETED': 'completed'
  }

  const currentStep = statusToStep[session.status] || 'unknown'

  // ステップに応じたデータを返す
  switch (currentStep) {
    case 'input':
      return {
        theme: session.theme,
        platform: session.platform,
        style: session.style
      }
    case 'topics':
      return session.topics
    case 'concepts':
      return session.concepts
    case 'content':
      return session.contents
    default:
      return null
  }
}

/**
 * 次のステップへ進むためのヘルパー関数
 */
export async function proceedToNextStep(sessionId: string, data?: any) {
  try {
    const response = await fetch(`/api/create/flow/${sessionId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, autoProgress: false })
    })

    if (!response.ok) {
      throw new Error(`Failed to proceed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    ClaudeLogger.error(
      { module: 'frontend', operation: 'proceed-next-step', sessionId },
      'Failed to proceed to next step',
      error
    )
    throw error
  }
}