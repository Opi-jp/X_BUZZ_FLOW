'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Sparkles, TrendingUp, Hash } from 'lucide-react'

interface Hook {
  type: string
  description: string
}

interface Angle {
  type: string
  description: string
}

interface Structure {
  openingHook: string
  background: string
  mainContent: string
  reflection: string
  cta: string
}

interface Concept {
  conceptId: string
  conceptTitle: string
  format: 'single' | 'thread'
  hookOptions: Hook[]
  angleOptions: Angle[]
  selectedHook: string
  selectedAngle: string
  viralScore: number
  viralFactors: string[]
  structure: Structure
  visual: string
  timing: string
  hashtags: string[]
}

interface ConceptSelectorProps {
  concepts: Concept[]
  onSelect: (selectedIds: string[]) => void
  maxSelections?: number
}

export default function ConceptSelector({ 
  concepts, 
  onSelect, 
  maxSelections = 3 
}: ConceptSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleSelection = (conceptId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(conceptId)) {
        return prev.filter(id => id !== conceptId)
      }
      if (prev.length >= maxSelections) {
        return prev
      }
      return [...prev, conceptId]
    })
  }

  const handleConfirm = () => {
    onSelect(selectedIds)
  }

  const getTopicNumber = (conceptId: string) => {
    const match = conceptId.match(/topic(\d+)/)
    return match ? parseInt(match[1]) + 1 : 0
  }

  const groupedConcepts = concepts.reduce((acc, concept) => {
    const topicNum = getTopicNumber(concept.conceptId)
    if (!acc[topicNum]) acc[topicNum] = []
    acc[topicNum].push(concept)
    return acc
  }, {} as Record<number, Concept[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">コンセプト選択</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {selectedIds.length} / {maxSelections} 選択中
          </span>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            選択を確定
          </button>
        </div>
      </div>

      {Object.entries(groupedConcepts).map(([topicNum, topicConcepts]) => (
        <div key={topicNum} className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            トピック {topicNum}
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topicConcepts.map((concept) => {
              const isSelected = selectedIds.includes(concept.conceptId)
              const isExpanded = expandedId === concept.conceptId
              
              return (
                <div
                  key={concept.conceptId}
                  className={`bg-white rounded-lg p-4 border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleSelection(concept.conceptId)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {concept.conceptTitle}
                      </h4>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          concept.format === 'thread' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {concept.format === 'thread' ? 'スレッド' : '単独'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-500" />
                          <span className="font-medium">{concept.viralScore}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-1">
                      {isSelected ? (
                        <CheckCircle2 className="w-6 h-6 text-blue-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">選択されたフック:</p>
                      <p className="text-sm text-gray-800">{concept.selectedHook}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">選択された角度:</p>
                      <p className="text-sm text-gray-800">{concept.selectedAngle}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">バイラル要因:</p>
                      <div className="flex flex-wrap gap-1">
                        {concept.viralFactors.map((factor, idx) => (
                          <span 
                            key={idx}
                            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(isExpanded ? null : concept.conceptId)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      {isExpanded ? '詳細を隠す' : '詳細を見る'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600">投稿構造:</p>
                          <p className="text-xs text-gray-700 mt-1">
                            {concept.structure.openingHook.substring(0, 50)}...
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600">ビジュアル:</p>
                          <p className="text-xs text-gray-700">{concept.visual}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600">投稿時間:</p>
                          <p className="text-xs text-gray-700">{concept.timing}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {selectedIds.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">選択されたコンセプト</h4>
          <ul className="space-y-1">
            {selectedIds.map(id => {
              const concept = concepts.find(c => c.conceptId === id)
              return concept ? (
                <li key={id} className="text-sm text-blue-700">
                  • {concept.conceptTitle} (スコア: {concept.viralScore})
                </li>
              ) : null
            })}
          </ul>
        </div>
      )}
    </div>
  )
}