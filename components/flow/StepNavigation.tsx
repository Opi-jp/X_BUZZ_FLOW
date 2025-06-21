'use client'

import { ChevronLeft, ChevronRight, Save, Send } from 'lucide-react'

interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  canGoBack?: boolean
  canGoNext?: boolean
  onBack?: () => void
  onNext?: () => void
  onSave?: () => void
  onComplete?: () => void
  backLabel?: string
  nextLabel?: string
  completeLabel?: string
  showSave?: boolean
  isLoading?: boolean
}

export function StepNavigation({
  currentStep,
  totalSteps,
  canGoBack = true,
  canGoNext = true,
  onBack,
  onNext,
  onSave,
  onComplete,
  backLabel = '戻る',
  nextLabel = '次へ',
  completeLabel = '完了',
  showSave = false,
  isLoading = false
}: StepNavigationProps) {
  const isLastStep = currentStep === totalSteps
  
  return (
    <div className="flex items-center justify-between bg-white border-t px-6 py-4">
      {/* 左側: 戻るボタン */}
      <div>
        {currentStep > 1 && (
          <button
            onClick={onBack}
            disabled={!canGoBack || isLoading}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all
              ${canGoBack && !isLoading
                ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                : 'text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </button>
        )}
      </div>

      {/* 中央: ステップ表示 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">
          ステップ {currentStep} / {totalSteps}
        </span>
        
        {/* プログレスバー */}
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* 右側: アクションボタン */}
      <div className="flex items-center gap-3">
        {/* 保存ボタン */}
        {showSave && onSave && (
          <button
            onClick={onSave}
            disabled={isLoading}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all
              ${!isLoading
                ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border border-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        )}

        {/* 次へ/完了ボタン */}
        {isLastStep ? (
          <button
            onClick={onComplete}
            disabled={!canGoNext || isLoading}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg transition-all
              ${canGoNext && !isLoading
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
            {completeLabel}
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg transition-all
              ${canGoNext && !isLoading
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {nextLabel}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ミニマルバージョン（モバイル対応）
export function MiniStepNavigation({
  onBack,
  onNext,
  canGoBack = true,
  canGoNext = true,
  isLoading = false
}: {
  onBack?: () => void
  onNext?: () => void
  canGoBack?: boolean
  canGoNext?: boolean
  isLoading?: boolean
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex justify-between md:hidden">
      <button
        onClick={onBack}
        disabled={!canGoBack || isLoading}
        className={`
          p-2 rounded-full transition-all
          ${canGoBack && !isLoading
            ? 'bg-gray-100 text-gray-700 active:bg-gray-200'
            : 'bg-gray-50 text-gray-400'
          }
        `}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <button
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className={`
          p-2 rounded-full transition-all
          ${canGoNext && !isLoading
            ? 'bg-purple-600 text-white active:bg-purple-700'
            : 'bg-gray-300 text-gray-500'
          }
        `}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}