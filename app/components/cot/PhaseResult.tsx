'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface PhaseResultProps {
  phase: number
  data: any
}

interface JsonDisplayProps {
  data: any
  level?: number
}

function JsonDisplay({ data, level = 0 }: JsonDisplayProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  
  if (data === null || data === undefined) {
    return <span className="text-gray-400">null</span>
  }
  
  if (typeof data === 'string') {
    return <span className="text-green-600">&quot;{data}&quot;</span>
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return <span className="text-blue-600">{String(data)}</span>
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-400">[]</span>
    }
    
    return (
      <div className="ml-4">
        <div className="text-gray-400">[</div>
        {data.map((item, index) => (
          <div key={index} className="ml-4">
            <span className="text-gray-400">{index}: </span>
            <JsonDisplay data={item} level={level + 1} />
            {index < data.length - 1 && <span className="text-gray-400">,</span>}
          </div>
        ))}
        <div className="text-gray-400">]</div>
      </div>
    )
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) {
      return <span className="text-gray-400">{'{}'}</span>
    }
    
    return (
      <div className="ml-4">
        <div className="text-gray-400">{'{'}</div>
        {keys.map((key, index) => {
          const isExpanded = expandedKeys.has(`${level}-${key}`)
          const hasChildren = typeof data[key] === 'object' && data[key] !== null
          
          return (
            <div key={key} className="ml-4">
              <div className="flex items-start">
                {hasChildren && (
                  <button
                    onClick={() => {
                      const keyPath = `${level}-${key}`
                      const newExpanded = new Set(expandedKeys)
                      if (isExpanded) {
                        newExpanded.delete(keyPath)
                      } else {
                        newExpanded.add(keyPath)
                      }
                      setExpandedKeys(newExpanded)
                    }}
                    className="mr-1 mt-0.5 text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
                <span className="text-purple-600">&quot;{key}&quot;</span>
                <span className="text-gray-400">: </span>
                {!hasChildren || isExpanded ? (
                  <JsonDisplay data={data[key]} level={level + 1} />
                ) : (
                  <span className="text-gray-400">
                    {Array.isArray(data[key]) ? `[${data[key].length} items]` : '{...}'}
                  </span>
                )}
                {index < keys.length - 1 && <span className="text-gray-400">,</span>}
              </div>
            </div>
          )
        })}
        <div className="text-gray-400">{'}'}</div>
      </div>
    )
  }
  
  return <span>{String(data)}</span>
}

export default function PhaseResult({ phase, data }: PhaseResultProps) {
  const [activeTab, setActiveTab] = useState<'think' | 'execute' | 'integrate'>('integrate')
  
  if (!data) {
    return null
  }

  const phaseNames = {
    1: 'トレンド収集',
    2: '機会評価', 
    3: 'コンセプト生成',
    4: 'コンテンツ作成',
    5: '実行戦略'
  }

  const tabs = [
    { key: 'think' as const, label: 'Think', data: data.thinkResult },
    { key: 'execute' as const, label: 'Execute', data: data.executeResult },
    { key: 'integrate' as const, label: 'Integrate', data: data.integrateResult }
  ].filter(tab => tab.data)

  // Phase結果の特別表示（よく使われるフィールド）
  const renderSpecialContent = () => {
    if (phase === 1 && data.integrateResult?.opportunities) {
      return (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">🎯 発見された機会</h4>
          <div className="space-y-2">
            {data.integrateResult.opportunities.map((opp: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-blue-800">{opp.title}</span>
                <span className="text-blue-600 font-medium">
                  スコア: {opp.viralPotential || opp.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (phase === 2 && data.integrateResult?.evaluatedOpportunities) {
      return (
        <div className="mb-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">📈 機会評価結果</h4>
          <div className="space-y-2">
            {data.integrateResult.evaluatedOpportunities
              .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
              .map((opp: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="text-green-800 font-medium">{index + 1}位: {opp.title}</span>
                    {opp.reasoning && (
                      <p className="text-sm text-green-700 mt-1">{opp.reasoning}</p>
                    )}
                  </div>
                  <span className="text-green-600 font-bold">{opp.score}点</span>
                </div>
              ))}
          </div>
        </div>
      )
    }

    if (phase === 3 && data.integrateResult?.concepts) {
      return (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">💡 生成されたコンセプト</h4>
          <div className="space-y-3">
            {data.integrateResult.concepts.map((concept: any, index: number) => (
              <div key={index} className="border border-purple-200 rounded p-3 bg-white">
                <h5 className="font-medium text-purple-800 mb-2">
                  コンセプト {concept.conceptNumber || index + 1}
                </h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>形式:</strong> {concept.A}</div>
                  <div><strong>狙い:</strong> {concept.B}</div>
                  <div><strong>角度:</strong> {concept.C}</div>
                  <div><strong>要素:</strong> {concept.D}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          ✅ Phase {phase}: {phaseNames[phase as keyof typeof phaseNames]}
        </h3>
        <span className="text-sm text-gray-500">
          結果を表示中
        </span>
      </div>

      {renderSpecialContent()}

      {tabs.length > 0 && (
        <>
          <div className="border-b border-gray-200 mb-4">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
            <JsonDisplay data={tabs.find(tab => tab.key === activeTab)?.data} />
          </div>
        </>
      )}
    </div>
  )
}