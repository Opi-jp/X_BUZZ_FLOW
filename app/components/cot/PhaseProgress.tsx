'use client'

import { Check, Clock, Play } from 'lucide-react'

interface PhaseProgressProps {
  currentPhase: number
  currentStep: 'THINK' | 'EXECUTE' | 'INTEGRATE'
  status: 'PENDING' | 'THINKING' | 'EXECUTING' | 'INTEGRATING' | 'COMPLETED' | 'ERROR'
}

const phases = [
  { number: 1, name: 'トレンド収集', description: 'Web検索とトレンド分析' },
  { number: 2, name: '機会評価+コンセプト', description: 'バイラル機会の評価とコンセプト生成（Phase 2&3統合）' },
  { number: 3, name: 'コンテンツ作成', description: '完全な投稿コンテンツ生成' },
  { number: 4, name: '実行戦略', description: 'KPIと投稿戦略策定' }
]

const stepLabels = {
  THINK: '思考中',
  EXECUTE: '実行中', 
  INTEGRATE: '統合中'
}

export default function PhaseProgress({ currentPhase, currentStep, status }: PhaseProgressProps) {
  const getPhaseStatus = (phaseNumber: number) => {
    if (phaseNumber < currentPhase) return 'completed'
    if (phaseNumber === currentPhase) {
      if (status === 'ERROR') return 'error'
      if (status === 'COMPLETED') return 'completed'
      return 'active'
    }
    return 'pending'
  }

  const getStepIcon = (phaseNumber: number) => {
    const phaseStatus = getPhaseStatus(phaseNumber)
    
    if (phaseStatus === 'completed') {
      return <Check className="w-5 h-5 text-green-600" />
    }
    if (phaseStatus === 'active') {
      return <Clock className="w-5 h-5 text-blue-600 animate-spin" />
    }
    if (phaseStatus === 'error') {
      return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">!</div>
    }
    return <div className="w-5 h-5 rounded-full bg-gray-300" />
  }

  const getPhaseClassName = (phaseNumber: number) => {
    const phaseStatus = getPhaseStatus(phaseNumber)
    const baseClass = "flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200"
    
    switch (phaseStatus) {
      case 'completed':
        return `${baseClass} bg-green-50 border-green-200`
      case 'active':
        return `${baseClass} bg-blue-50 border-blue-200 shadow-md`
      case 'error':
        return `${baseClass} bg-red-50 border-red-200`
      default:
        return `${baseClass} bg-gray-50 border-gray-200`
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Chain of Thought 進行状況</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Phase {currentPhase}/5</span>
          {status !== 'COMPLETED' && status !== 'ERROR' && (
            <>
              <span>•</span>
              <span>{stepLabels[currentStep]}</span>
            </>
          )}
          {status === 'ERROR' && (
            <>
              <span>•</span>
              <span className="text-red-600">エラーが発生しました</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {phases.map((phase) => (
          <div key={phase.number} className={getPhaseClassName(phase.number)}>
            <div className="flex-shrink-0">
              {getStepIcon(phase.number)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">
                  Phase {phase.number}: {phase.name}
                </h3>
                {phase.number === currentPhase && status !== 'COMPLETED' && status !== 'ERROR' && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {stepLabels[currentStep]}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {phase.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {status === 'COMPLETED' && (
        <div className="mt-6 p-4 bg-green-100 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              Chain of Thought処理が完了しました
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            下書きが生成されました。編集画面で内容を確認してください。
          </p>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="mt-6 p-4 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">!</div>
            <span className="font-medium text-red-800">
              処理中にエラーが発生しました
            </span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            しばらく時間をおいてから再試行してください。
          </p>
        </div>
      )}
    </div>
  )
}