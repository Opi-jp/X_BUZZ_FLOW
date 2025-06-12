'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StepStatus {
  step: number
  name: string
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped'
  message?: string
  duration?: string
}

export default function AutoExecutePage() {
  const router = useRouter()
  const [isExecuting, setIsExecuting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [steps, setSteps] = useState<StepStatus[]>([
    { step: 1, name: 'データ収集・Web検索', status: 'pending' },
    { step: 2, name: 'トレンド評価', status: 'pending' },
    { step: 3, name: 'コンセプト作成', status: 'pending' },
    { step: 4, name: 'コンテンツ生成', status: 'pending' },
    { step: 5, name: '実行戦略', status: 'pending' }
  ])
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const updateStepStatus = (stepNumber: number, status: StepStatus['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.step === stepNumber 
        ? { ...step, status, message } 
        : step
    ))
  }

  const executeAutoComplete = async () => {
    try {
      setIsExecuting(true)
      setError(null)
      setResult(null)

      // まず新しいセッションを作成
      updateStepStatus(1, 'running', 'セッション作成中...')
      
      const createResponse = await fetch('/api/viral/gpt-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            expertise: 'クリエイティブディレクター',
            platform: 'Twitter',
            style: '教育的',
            model: 'gpt-4o' // Web検索にはGPT-4o必須
          }
        })
      })

      if (!createResponse.ok) {
        throw new Error('セッション作成に失敗しました')
      }

      const { sessionId: newSessionId } = await createResponse.json()
      setSessionId(newSessionId)

      // 自動実行開始
      updateStepStatus(1, 'running', 'Web検索でデータ収集中...')

      const response = await fetch('/api/viral/gpt-session/auto-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: newSessionId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '自動実行に失敗しました')
      }

      // 結果に基づいてステップ状態を更新
      if (data.summary.step1.opportunityCount) {
        updateStepStatus(1, 'success', `${data.summary.step1.opportunityCount}件の機会を発見`)
      } else {
        updateStepStatus(1, 'error', data.summary.step1.error)
      }

      if (data.summary.step2 === '評価完了') {
        updateStepStatus(2, 'success', '評価完了')
      } else if (data.summary.step2?.error) {
        updateStepStatus(2, 'error', data.summary.step2.error)
      }

      if (data.summary.step3 === 'コンセプト作成完了') {
        updateStepStatus(3, 'success', 'コンセプト作成完了')
      } else if (data.summary.step3?.error) {
        updateStepStatus(3, 'error', data.summary.step3.error)
      }

      if (data.summary.step4 === 'コンテンツ生成完了') {
        updateStepStatus(4, 'success', 'コンテンツ生成完了')
      } else if (data.summary.step4?.error) {
        updateStepStatus(4, 'error', data.summary.step4.error)
      }

      if (data.summary.step5 === '戦略作成完了') {
        updateStepStatus(5, 'success', '戦略作成完了')
      } else if (data.summary.step5?.error) {
        updateStepStatus(5, 'error', data.summary.step5.error)
      }

      setResult(data)

      // 成功したら3秒後に下書きページへ
      if (data.success && data.draftsCreated > 0) {
        setTimeout(() => {
          router.push('/viral/drafts')
        }, 3000)
      }

    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : '予期しないエラーが発生しました')
      
      // エラーが発生したステップを特定
      steps.forEach(step => {
        if (step.status === 'running') {
          updateStepStatus(step.step, 'error', 'エラーが発生しました')
        }
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const getStepIcon = (status: StepStatus['status']) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'running':
        return '🔄'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'skipped':
        return '⏭️'
    }
  }

  const getStepColor = (status: StepStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500'
      case 'running':
        return 'text-blue-500 animate-pulse'
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      case 'skipped':
        return 'text-gray-400'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chain of Thought 自動実行</h1>
        <p className="text-gray-600">
          ChatGPTで成功している5段階プロセスを完全自動化します
        </p>
        <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md inline-block">
          💡 Web検索機能は GPT-4o + Responses API でのみ動作します
        </div>
      </div>

      {/* ステップ表示 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">実行ステップ</h2>
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.step} className="flex items-center space-x-3">
              <span className={`text-2xl ${getStepColor(step.status)}`}>
                {getStepIcon(step.status)}
              </span>
              <div className="flex-1">
                <div className={`font-medium ${getStepColor(step.status)}`}>
                  Step {step.step}: {step.name}
                </div>
                {step.message && (
                  <div className="text-sm text-gray-500">{step.message}</div>
                )}
              </div>
              {step.duration && (
                <div className="text-sm text-gray-400">{step.duration}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 実行ボタン */}
      <div className="text-center mb-6">
        <button
          onClick={executeAutoComplete}
          disabled={isExecuting}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            isExecuting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl'
          }`}
        >
          {isExecuting ? '実行中...' : '自動実行を開始'}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">
            実行完了
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-green-700">
              所要時間: {result.summary.totalDuration}
            </p>
            <p className="text-green-700">
              成功ステップ: {result.summary.successfulSteps}/5
            </p>
            {result.draftsCreated > 0 && (
              <p className="text-green-700 font-semibold">
                {result.draftsCreated}件のコンテンツを生成しました
              </p>
            )}
          </div>
          {result.nextAction && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-green-600 text-sm">
                3秒後に下書きページへ移動します...
              </p>
            </div>
          )}
        </div>
      )}

      {/* デバッグ情報 */}
      {sessionId && (
        <div className="mt-6 text-xs text-gray-400">
          Session ID: {sessionId}
        </div>
      )}
    </div>
  )
}