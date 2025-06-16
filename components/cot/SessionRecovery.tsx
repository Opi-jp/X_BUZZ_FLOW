'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, RefreshCw, SkipForward, RotateCcw } from 'lucide-react'

interface SessionRecoveryProps {
  sessionId: string
  onRecoveryComplete?: () => void
}

interface HealthCheck {
  isHealthy: boolean
  issues: string[]
  recommendations: string[]
}

export function SessionRecovery({ sessionId, onRecoveryComplete }: SessionRecoveryProps) {
  const [health, setHealth] = useState<HealthCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')

  useEffect(() => {
    checkHealth()
  }, [sessionId])

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}/recover`)
      const data = await response.json()
      setHealth(data.health)
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecovery = async (action: string, phaseNumber?: number) => {
    setRecovering(true)
    setRecoveryMessage('')
    
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, phaseNumber })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setRecoveryMessage(`✅ ${result.message}`)
        if (result.newSessionId) {
          // 新しいセッションにリダイレクト
          window.location.href = `/viral/cot/session/${result.newSessionId}`
        } else {
          // 現在のセッションをリロード
          setTimeout(() => {
            onRecoveryComplete?.()
            checkHealth()
          }, 2000)
        }
      } else {
        setRecoveryMessage(`❌ リカバリー失敗: ${result.error}`)
      }
    } catch (error) {
      setRecoveryMessage('❌ リカバリー中にエラーが発生しました')
    } finally {
      setRecovering(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="animate-spin h-4 w-4" />
            <span>健全性をチェック中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!health || health.isHealthy) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-800">
          <AlertCircle className="h-5 w-5" />
          <span>セッションの問題を検出</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 問題の表示 */}
        <div>
          <h4 className="font-medium text-sm text-orange-700 mb-2">検出された問題:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {health.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>

        {/* 推奨事項 */}
        <div>
          <h4 className="font-medium text-sm text-orange-700 mb-2">推奨されるアクション:</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            {health.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* リカバリーアクション */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRecovery('retry')}
            disabled={recovering}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            リトライ
          </Button>
          
          {health.recommendations.some(r => r.includes('Restart phase')) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const match = health.recommendations[0].match(/phase (\d+)/)
                if (match) {
                  handleRecovery('restart_phase', parseInt(match[1]))
                }
              }}
              disabled={recovering}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              フェーズから再開
            </Button>
          )}
          
          {health.recommendations.includes('Start fresh session') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRecovery('restart_session')}
              disabled={recovering}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              新規セッション
            </Button>
          )}
        </div>

        {/* リカバリーメッセージ */}
        {recoveryMessage && (
          <Alert className="mt-4">
            <AlertDescription>{recoveryMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}