'use client'

import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  message?: string
  submessage?: string
  fullScreen?: boolean
  transparent?: boolean
}

export function LoadingOverlay({ 
  message = '処理中...', 
  submessage,
  fullScreen = false,
  transparent = false
}: LoadingOverlayProps) {
  const overlayClasses = fullScreen
    ? 'fixed inset-0 z-50'
    : 'absolute inset-0 z-10'
    
  const backgroundClasses = transparent
    ? 'bg-white/50 backdrop-blur-sm'
    : 'bg-white/90'

  return (
    <div className={`${overlayClasses} ${backgroundClasses} flex items-center justify-center`}>
      <div className="text-center">
        <div className="relative">
          {/* メインローダー */}
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
          
          {/* パルスエフェクト */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-purple-600 rounded-full animate-ping opacity-20" />
          </div>
        </div>
        
        {/* メッセージ */}
        <p className="mt-4 text-lg font-medium text-gray-900">{message}</p>
        
        {/* サブメッセージ */}
        {submessage && (
          <p className="mt-2 text-sm text-gray-600">{submessage}</p>
        )}
        
        {/* プログレスドット */}
        <div className="mt-4 flex justify-center space-x-1">
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// 特定のフェーズ用のプリセット
export function PerplexityLoadingOverlay() {
  return (
    <LoadingOverlay
      message="Perplexityで最新情報を収集中..."
      submessage="予想時間: 30-60秒"
      fullScreen
    />
  )
}

export function GPTLoadingOverlay() {
  return (
    <LoadingOverlay
      message="GPTでコンセプトを生成中..."
      submessage="予想時間: 15-45秒"
      fullScreen
    />
  )
}

export function ClaudeLoadingOverlay() {
  return (
    <LoadingOverlay
      message="Claudeで投稿文を作成中..."
      submessage="予想時間: 10-30秒"
      fullScreen
    />
  )
}