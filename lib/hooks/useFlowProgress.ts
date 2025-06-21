import { useEffect, useState, useCallback } from 'react'

export interface FlowProgress {
  status: string
  error?: string
  data: {
    theme?: string
    platform?: string
    style?: string
    hasTopics: boolean
    hasConcepts: boolean
    selectedIds?: string[]
    hasContents: boolean
    updatedAt: Date
  }
  currentStep: number
  progress: number
}

export function useFlowProgress(sessionId: string | null, onUpdate?: (progress: FlowProgress) => void) {
  const [progress, setProgress] = useState<FlowProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(() => {
    if (!sessionId || sessionId === 'new') return

    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let retryCount = 0
    const maxRetries = 3

    const cleanup = () => {
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      setIsConnected(false)
    }

    const attemptConnection = () => {
      try {
        eventSource = new EventSource(`/api/create/flow/${sessionId}/progress`)
        
        eventSource.onopen = () => {
          setIsConnected(true)
          setError(null)
          retryCount = 0
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.error) {
              setError(data.error)
              cleanup()
              return
            }
            
            setProgress(data)
            if (onUpdate) {
              onUpdate(data)
            }
            
            // 完了状態になったら接続を閉じる
            if (data.status === 'DRAFTS_CREATED' || data.error) {
              cleanup()
            }
          } catch (err) {
            console.error('Failed to parse progress data:', err)
          }
        }

        eventSource.onerror = (err) => {
          console.error('SSE connection error:', err)
          cleanup()
          
          // 再接続ロジック
          if (retryCount < maxRetries) {
            retryCount++
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000) // 指数バックオフ
            reconnectTimeout = setTimeout(attemptConnection, delay)
          } else {
            setError('接続が失敗しました。ページをリロードしてください。')
          }
        }
      } catch (err) {
        console.error('Failed to create EventSource:', err)
        setError('進捗の監視を開始できませんでした')
      }
    }

    attemptConnection()

    return cleanup
  }, [sessionId, onUpdate])

  useEffect(() => {
    const cleanup = connect()
    return () => {
      if (cleanup) cleanup()
    }
  }, [connect])

  return {
    progress,
    error,
    isConnected,
    reconnect: connect
  }
}