'use client'

import { useState } from 'react'
import {
  StepIndicator,
  LoadingOverlay,
  ErrorBoundary,
  StepNavigation,
  APIErrorFallback,
  FLOW_STEPS
} from '@/components/flow'
import { JSTClock } from '@/components/flow/JSTClock'

export default function TestComponentsPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [showLoading, setShowLoading] = useState(false)
  const [showError, setShowError] = useState(false)
  
  // テスト用のステップデータ
  const steps = FLOW_STEPS.map(step => ({
    ...step,
    status: step.id < currentStep ? 'completed' as const :
            step.id === currentStep ? 'current' as const :
            'pending' as const
  }))

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* ヘッダー */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cardi-SYSTEM コンポーネントテスト
            </h1>
            <p className="text-gray-600">
              Vercel、Next.js、TailwindCSS、日本語フォント（M PLUS 1p / Noto Sans JP）の整合性確認
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">
                Cardi Dareの哲学：「人間は最適化できない。それが救いだ。」
              </p>
              <JSTClock />
            </div>
          </div>

          {/* StepIndicator テスト */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">StepIndicator</h2>
            
            {/* Horizontal */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Horizontal Variant
              </h3>
              <StepIndicator
                steps={steps}
                currentStep={currentStep}
                variant="horizontal"
              />
            </div>
            
            {/* Vertical */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Vertical Variant
              </h3>
              <div className="max-w-md">
                <StepIndicator
                  steps={steps}
                  currentStep={currentStep}
                  variant="vertical"
                />
              </div>
            </div>
          </div>

          {/* StepNavigation テスト */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">StepNavigation</h2>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={16}
              canGoBack={currentStep > 1}
              canGoNext={currentStep < 16}
              onBack={() => setCurrentStep(Math.max(1, currentStep - 1))}
              onNext={() => setCurrentStep(Math.min(16, currentStep + 1))}
              showSave
              onSave={() => alert('保存しました')}
              isLoading={false}
            />
          </div>

          {/* LoadingOverlay テスト */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">LoadingOverlay</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowLoading(true)
                  setTimeout(() => setShowLoading(false), 3000)
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                ローディングを表示（3秒）
              </button>
              
              <div className="relative h-40 bg-gray-100 rounded-lg">
                <p className="p-4">相対位置のコンテナ内でのローディング</p>
                {showLoading && (
                  <LoadingOverlay
                    message="処理中..."
                    submessage="しばらくお待ちください"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Error Handling テスト */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Error Handling</h2>
            <div className="space-y-4">
              <button
                onClick={() => setShowError(!showError)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                エラーを{showError ? '非表示' : '表示'}
              </button>
              
              {showError && (
                <APIErrorFallback
                  error={{ message: 'APIサーバーに接続できません' }}
                  onRetry={() => {
                    alert('再試行しました')
                    setShowError(false)
                  }}
                />
              )}
            </div>
          </div>

          {/* TailwindCSS Classes テスト */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">TailwindCSS Classes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Colors */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Colors</h3>
                <div className="w-full h-10 bg-purple-600 rounded"></div>
                <div className="w-full h-10 bg-green-600 rounded"></div>
                <div className="w-full h-10 bg-red-600 rounded"></div>
              </div>
              
              {/* Animations */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Animations</h3>
                <div className="w-10 h-10 bg-purple-600 rounded-full animate-bounce"></div>
                <div className="w-10 h-10 bg-purple-600 rounded-full animate-ping"></div>
                <div className="w-10 h-10 bg-purple-600 rounded-full animate-spin"></div>
              </div>
              
              {/* Transitions */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Transitions</h3>
                <button className="px-4 py-2 bg-purple-600 text-white rounded transition-all hover:bg-purple-700 hover:scale-105">
                  Hover me
                </button>
              </div>
              
              {/* Responsive */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Responsive</h3>
                <div className="w-full h-10 bg-purple-600 md:bg-green-600 lg:bg-blue-600 rounded"></div>
                <p className="text-xs text-gray-600">
                  md: green, lg: blue
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}