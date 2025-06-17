import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ViralSession, isValidSessionId, isErrorResponse } from '@/types/viral-v2'

interface UseViralSessionOptions {
  autoRedirectOnError?: boolean
  autoCollectTopics?: boolean
}

interface UseViralSessionReturn {
  session: ViralSession | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isValidSession: boolean
}

export function useViralSession(
  sessionId: string | undefined,
  options: UseViralSessionOptions = {}
): UseViralSessionReturn {
  const {
    autoRedirectOnError = true,
    autoCollectTopics = false
  } = options
  
  const router = useRouter()
  const [session, setSession] = useState<ViralSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoCollectTriggered, setAutoCollectTriggered] = useState(false)

  const fetchSession = useCallback(async () => {
    // Validate session ID
    if (!isValidSessionId(sessionId)) {
      setError('無効なセッションIDです')
      setLoading(false)
      if (autoRedirectOnError) {
        router.push('/viral/v2/sessions')
      }
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/viral/v2/sessions/${sessionId}`)
      const data = await response.json()
      
      if (!response.ok || isErrorResponse(data)) {
        throw new Error(data.error || 'Failed to fetch session')
      }
      
      setSession(data.session)
      
      // Auto-collect topics if enabled and not already triggered
      if (
        autoCollectTopics &&
        data.session.status === 'CREATED' &&
        !autoCollectTriggered
      ) {
        setAutoCollectTriggered(true)
        // Trigger topic collection in the background
        fetch(`/api/viral/v2/sessions/${sessionId}/collect-topics`, {
          method: 'POST'
        }).catch(console.error)
      }
    } catch (err: any) {
      const errorMessage = err.message || 'セッションの取得に失敗しました'
      setError(errorMessage)
      console.error('Error fetching session:', err)
      
      if (autoRedirectOnError && err.message?.includes('not found')) {
        router.push('/viral/v2/sessions')
      }
    } finally {
      setLoading(false)
    }
  }, [sessionId, autoRedirectOnError, autoCollectTopics, autoCollectTriggered, router])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return {
    session,
    loading,
    error,
    refetch: fetchSession,
    isValidSession: !!session && !error
  }
}