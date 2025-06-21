'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
    
    // エラーログをサーバーに送信（本番環境の場合）
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  logErrorToService = (error: Error, errorInfo: any) => {
    // エラーログAPI呼び出し
    fetch('/api/logs/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    }).catch(console.error)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      return <DefaultErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

// デフォルトのエラー表示コンポーネント
function DefaultErrorFallback({ 
  error, 
  onReset 
}: { 
  error: Error | null
  onReset: () => void 
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* エラーアイコン */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* エラーメッセージ */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-center text-gray-600 mb-6">
            申し訳ございません。予期しないエラーが発生しました。
          </p>

          {/* エラー詳細（開発環境のみ） */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6 p-4 bg-gray-100 rounded-md">
              <p className="text-sm font-mono text-gray-700 break-all">
                {error.toString()}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                    スタックトレースを表示
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              再試行
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              ホームに戻る
            </button>
          </div>

          {/* サポート情報 */}
          <p className="mt-6 text-xs text-center text-gray-500">
            問題が続く場合は、サポートまでお問い合わせください
          </p>
        </div>
      </div>
    </div>
  )
}

// 特定のエラータイプ用のカスタムエラー表示
export function APIErrorFallback({ 
  error,
  onRetry 
}: { 
  error: any
  onRetry: () => void 
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">API接続エラー</h3>
          <p className="mt-1 text-sm text-red-700">
            {error?.message || 'サーバーとの通信に失敗しました'}
          </p>
          <button
            onClick={onRetry}
            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
          >
            もう一度試す
          </button>
        </div>
      </div>
    </div>
  )
}