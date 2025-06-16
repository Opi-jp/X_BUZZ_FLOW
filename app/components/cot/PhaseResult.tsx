'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface PhaseResultProps {
  phase: number
  data: any
  onProceedToNextPhase?: (phaseNumber: number) => void
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

export default function PhaseResult({ phase, data, onProceedToNextPhase }: PhaseResultProps) {
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
    if (phase === 1 && data.executeResult?.savedPerplexityResponses) {
      return (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-4">📰 注目の記事</h4>
          <div className="grid gap-4">
            {data.executeResult.savedPerplexityResponses.map((response: any, index: number) => {
              // Perplexityレスポンスからソース情報を抽出
              const sources = response.content?.match(/\[(https?:\/\/[^\]]+)\]/g)?.map((url: string) => 
                url.replace(/[\[\]]/g, '')
              ) || []
              
              // レスポンス内容からタイトルと要約を抽出
              const content = response.content || ''
              const lines = content.split('\n').filter((line: string) => line.trim())
              const title = response.query || `検索結果 ${index + 1}`
              
              // 要約を抽出（最初の段落または200文字）
              const summary = lines.find((line: string) => line.length > 50)?.slice(0, 200) + '...' || 
                             content.slice(0, 200) + '...'

              return (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex gap-4">
                    {/* サムネイル領域（将来のOG画像表示用） */}
                    <div className="w-24 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    
                    {/* 記事情報 */}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 mb-2 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                        {title}
                      </h5>
                      <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'}}>
                        {summary}
                      </p>
                      
                      {/* ソースリンク */}
                      {sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {sources.slice(0, 2).map((source, sourceIndex) => {
                            try {
                              const domain = new URL(source).hostname.replace('www.', '')
                              return (
                                <a
                                  key={sourceIndex}
                                  href={source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  {domain}
                                </a>
                              )
                            } catch {
                              return null
                            }
                          })}
                          {sources.length > 2 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{sources.length - 2} その他
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* 発見された機会の表示 */}
          {data.integrateResult?.opportunities && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
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
              
              {/* アクションボタン */}
              {onProceedToNextPhase && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <button 
                    onClick={() => onProceedToNextPhase(phase + 1)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    この情報でコンセプトを作成
                  </button>
                </div>
              )}
            </div>
          )}
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