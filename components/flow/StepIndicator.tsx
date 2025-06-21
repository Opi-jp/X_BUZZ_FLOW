'use client'

import { Check, Loader2 } from 'lucide-react'

export interface Step {
  id: number
  name: string
  status: 'pending' | 'current' | 'completed' | 'error'
  description?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  variant?: 'horizontal' | 'vertical'
}

export function StepIndicator({ 
  steps, 
  currentStep, 
  variant = 'horizontal' 
}: StepIndicatorProps) {
  return (
    <div className={`${variant === 'horizontal' ? 'flex items-center justify-between' : 'space-y-4'}`}>
      {steps.map((step, index) => (
        <div 
          key={step.id} 
          className={`${variant === 'horizontal' ? 'flex items-center' : 'flex'}`}
        >
          {/* ステップサークル */}
          <div className="relative">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-medium
              transition-all duration-300 
              ${step.status === 'completed' 
                ? 'bg-green-500 text-white' 
                : step.status === 'current'
                ? 'bg-purple-600 text-white ring-4 ring-purple-100'
                : step.status === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-500'
              }
            `}>
              {step.status === 'completed' ? (
                <Check className="w-5 h-5" />
              ) : step.status === 'current' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : step.status === 'error' ? (
                '!'
              ) : (
                step.id
              )}
            </div>
            
            {/* パルスアニメーション（現在のステップ） */}
            {step.status === 'current' && (
              <div className="absolute inset-0 rounded-full bg-purple-600 animate-ping opacity-25" />
            )}
          </div>
          
          {/* ステップ情報 */}
          {variant === 'vertical' && (
            <div className="ml-4 flex-1">
              <h4 className={`font-medium ${
                step.status === 'completed' ? 'text-green-700' :
                step.status === 'current' ? 'text-purple-700' :
                step.status === 'error' ? 'text-red-700' :
                'text-gray-500'
              }`}>
                {step.name}
              </h4>
              {step.description && (
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              )}
            </div>
          )}
          
          {/* 接続線（最後のステップ以外） */}
          {index < steps.length - 1 && variant === 'horizontal' && (
            <div className={`
              flex-1 h-0.5 mx-2
              ${steps[index + 1].status !== 'pending' 
                ? 'bg-purple-500' 
                : 'bg-gray-200'
              }
            `} />
          )}
        </div>
      ))}
    </div>
  )
}

// 16ステップの定義
export const FLOW_STEPS: Omit<Step, 'status'>[] = [
  { id: 1, name: 'テーマ入力', description: 'コンテンツのテーマを入力' },
  { id: 2, name: 'DB保存', description: 'セッション情報をDBに保存' },
  { id: 3, name: 'プロンプト準備', description: 'Perplexity用プロンプト準備' },
  { id: 4, name: 'Perplexity実行', description: 'トピック収集中' },
  { id: 5, name: 'トピック保存', description: 'DBに結果を保存' },
  { id: 6, name: 'トピック表示', description: '収集結果の確認' },
  { id: 7, name: 'GPT準備', description: 'コンセプト生成準備' },
  { id: 8, name: 'コンセプト生成', description: 'GPTでコンセプト生成' },
  { id: 9, name: 'コンセプト保存', description: 'DBに保存' },
  { id: 10, name: 'コンセプト選択', description: '使用するコンセプトを選択' },
  { id: 11, name: 'Claude準備', description: '投稿文生成準備' },
  { id: 12, name: '投稿文生成', description: 'Claudeで投稿文作成' },
  { id: 13, name: '投稿文保存', description: 'DBに保存' },
  { id: 14, name: '投稿文表示', description: '生成結果の確認' },
  { id: 15, name: '下書き作成', description: '投稿用下書きを作成' },
  { id: 16, name: '下書き確認', description: '最終確認と編集' },
]