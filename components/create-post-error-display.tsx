'use client'

import { AlertCircle, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CreatePostErrorResponse, CreatePostPhase } from '@/lib/create-post-error-handler'

interface CreatePostErrorDisplayProps {
  error: CreatePostErrorResponse
  onRetry?: () => void
  onDismiss?: () => void
}

const phaseDisplayNames: Record<CreatePostPhase, string> = {
  [CreatePostPhase.PERPLEXITY]: '情報収集',
  [CreatePostPhase.GPT]: 'コンセプト生成',
  [CreatePostPhase.CLAUDE]: '投稿文生成',
  [CreatePostPhase.DRAFT]: '下書き作成',
  [CreatePostPhase.POST]: '投稿'
}

export function CreatePostErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss 
}: CreatePostErrorDisplayProps) {
  const phaseDisplay = phaseDisplayNames[error.phase] || error.phase

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{phaseDisplay}でエラーが発生しました</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{error.userMessage}</p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">詳細情報（開発用）</summary>
            <pre className="mt-2 overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify({
                code: error.code,
                error: error.error,
                details: error.details,
                requestId: error.requestId,
                timestamp: error.timestamp
              }, null, 2)}
            </pre>
          </details>
        )}
        
        {error.retryable && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            再試行
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

/**
 * エラー状態を管理するカスタムフック
 */
export function useCreatePostError() {
  const [errors, setErrors] = useState<Map<string, CreatePostErrorResponse>>(new Map())
  
  const addError = (key: string, error: CreatePostErrorResponse) => {
    setErrors(prev => new Map(prev).set(key, error))
  }
  
  const removeError = (key: string) => {
    setErrors(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }
  
  const clearErrors = () => {
    setErrors(new Map())
  }
  
  const hasErrors = errors.size > 0
  
  return {
    errors: Array.from(errors.entries()),
    addError,
    removeError,
    clearErrors,
    hasErrors
  }
}

// 使用例のため必要なインポート
import { useState } from 'react'