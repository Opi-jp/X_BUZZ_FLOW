'use client'

import { Check, Clock, Play, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface PhaseProgressV2Props {
  currentPhase: number
  currentStep?: 'THINK' | 'EXECUTE' | 'INTEGRATE'
  status: 'PENDING' | 'THINKING' | 'EXECUTING' | 'INTEGRATING' | 'COMPLETED' | 'ERROR'
  phases: PhaseData[]
  onProceedToNextPhase?: (phaseNumber: number) => void
}

interface PhaseData {
  number: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  thinkResult?: any
  executeResult?: any
  integrateResult?: any
  error?: string
}

const phaseDefinitions = [
  { 
    number: 1, 
    name: 'トレンド収集', 
    description: 'Web検索とトレンド分析',
    steps: ['THINK', 'EXECUTE', 'INTEGRATE'],
    autoProgress: true
  },
  { 
    number: 2, 
    name: '機会評価+コンセプト', 
    description: 'バイラル機会の評価とコンセプト生成',
    steps: ['THINK'],
    autoProgress: false
  },
  { 
    number: 3, 
    name: 'コンテンツ作成', 
    description: '完全な投稿コンテンツ生成',
    steps: ['THINK'],
    autoProgress: false
  },
  { 
    number: 4, 
    name: '実行戦略', 
    description: 'KPIと投稿戦略策定',
    steps: ['THINK'],
    autoProgress: false
  }
]

const stepLabels = {
  THINK: '思考・分析',
  EXECUTE: 'Perplexity検索', 
  INTEGRATE: '結果統合'
}

export default function PhaseProgressV2({ 
  currentPhase, 
  currentStep, 
  status, 
  phases,
  onProceedToNextPhase 
}: PhaseProgressV2Props) {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([currentPhase]))

  const getPhaseStatus = (phaseNumber: number): 'pending' | 'processing' | 'completed' | 'error' => {
    const phaseData = phases.find(p => p.number === phaseNumber)
    if (phaseData) return phaseData.status

    if (phaseNumber < currentPhase) return 'completed'
    if (phaseNumber === currentPhase) {
      if (status === 'ERROR') return 'error'
      if (status === 'COMPLETED') return 'completed'
      if (status === 'PENDING') return 'pending'
      return 'processing'
    }
    return 'pending'
  }

  const getPhaseIcon = (phaseNumber: number) => {
    const phaseStatus = getPhaseStatus(phaseNumber)
    
    if (phaseStatus === 'completed') {
      return <Check className="w-5 h-5 text-green-600" />
    }
    if (phaseStatus === 'processing') {
      return <Clock className="w-5 h-5 text-blue-600 animate-spin" />
    }
    if (phaseStatus === 'error') {
      return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">!</div>
    }
    return <div className="w-5 h-5 rounded-full bg-gray-300" />
  }

  const canProceedToNext = (phaseNumber: number): boolean => {
    const phaseData = phases.find(p => p.number === phaseNumber)
    if (!phaseData) return false
    
    const definition = phaseDefinitions.find(d => d.number === phaseNumber)
    if (!definition) return false

    // Phase 1は3ステップ完了、Phase 2-4はTHINK完了で次へ進める
    if (definition.number === 1) {
      return phaseData?.thinkResult && phaseData?.executeResult && phaseData?.integrateResult
    } else {
      return phaseData?.thinkResult
    }
  }

  const togglePhaseExpansion = (phaseNumber: number) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phaseNumber)) {
      newExpanded.delete(phaseNumber)
    } else {
      newExpanded.add(phaseNumber)
    }
    setExpandedPhases(newExpanded)
  }

  return (
    <div className="space-y-4">
      {phaseDefinitions.map((definition, index) => {
        const phaseStatus = getPhaseStatus(definition.number)
        const phaseData = phases.find(p => p.number === definition.number)
        const isExpanded = expandedPhases.has(definition.number)
        const isCurrentPhase = definition.number === currentPhase

        return (
          <div key={definition.number} className="border rounded-lg">
            {/* Phase Header */}
            <div 
              className={`p-4 cursor-pointer transition-colors ${
                isCurrentPhase ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => togglePhaseExpansion(definition.number)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getPhaseIcon(definition.number)}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Phase {definition.number}: {definition.name}
                    </h3>
                    <p className="text-sm text-gray-600">{definition.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Current Step Display for Phase 1 */}
                  {isCurrentPhase && definition.number === 1 && currentStep && (
                    <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      {stepLabels[currentStep]}
                    </span>
                  )}
                  
                  {/* Progress Indicator */}
                  <span className={`text-sm px-2 py-1 rounded ${
                    phaseStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    phaseStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                    phaseStatus === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {phaseStatus === 'completed' ? '完了' :
                     phaseStatus === 'processing' ? '処理中' :
                     phaseStatus === 'error' ? 'エラー' : '待機中'}
                  </span>
                  
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Phase Details */}
            {isExpanded && (
              <div className="border-t bg-gray-50 p-4">
                {phaseData || (isCurrentPhase && phaseStatus === 'processing') ? (
                  <div className="space-y-3">
                    {/* Phase 1の3ステップ表示 */}
                    {definition.number === 1 && (
                      <div className="grid gap-3">
                        <div className="flex items-center justify-between p-3 bg-white rounded border">
                          <span className="font-medium">1. Think（検索クエリ生成）</span>
                          {phaseData?.thinkResult ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded border">
                          <span className="font-medium">2. Execute（Perplexity検索）</span>
                          {phaseData?.executeResult ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded border">
                          <span className="font-medium">3. Integrate（結果統合）</span>
                          {phaseData?.integrateResult ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Phase 2-4の結果表示 */}
                    {definition.number > 1 && phaseData?.thinkResult && (
                      <div className="bg-white p-3 rounded border">
                        <h4 className="font-medium mb-2">生成結果</h4>
                        <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(phaseData?.thinkResult, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Next Phase Button */}
                    {canProceedToNext(definition.number) && 
                     definition.number < phaseDefinitions.length && 
                     onProceedToNextPhase && (
                      <button
                        onClick={() => onProceedToNextPhase(definition.number + 1)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                      >
                        <span>
                          {definition.number === 1 ? 'コンセプトを作成' :
                           definition.number === 2 ? 'コンテンツを作成' :
                           definition.number === 3 ? '実行戦略を策定' :
                           `Phase ${definition.number + 1}へ進む`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* Error Display */}
                    {phaseData?.error && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded">
                        <h4 className="font-medium text-red-800 mb-1">エラー</h4>
                        <p className="text-sm text-red-700">{phaseData?.error}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    {phaseStatus === 'pending' ? (
                      <p className="text-gray-600">このフェーズはまだ開始されていません</p>
                    ) : (
                      <p className="text-blue-600">処理が開始されています...</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}