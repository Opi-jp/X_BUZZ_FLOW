'use client'

import { useState } from 'react'
import { Sparkles, Target, TrendingUp, AlertCircle } from 'lucide-react'

interface Concept {
  conceptId: string
  conceptTitle: string
  selectedHook: string
  selectedAngle: string
  viralScore: number
  reasoning?: string
  structure?: {
    hook?: string
    background?: string
    mainContent?: string
    callToAction?: string
  }
}

interface ConceptSelectionStepProps {
  concepts: Concept[]
  onSelect: (selectedIds: string[]) => void
  isLoading?: boolean
}

export function ConceptSelectionStep({ concepts, onSelect, isLoading }: ConceptSelectionStepProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState<string | null>(null)

  const toggleSelection = (conceptId: string) => {
    if (selectedIds.includes(conceptId)) {
      setSelectedIds(selectedIds.filter(id => id !== conceptId))
    } else if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, conceptId])
    }
  }

  const handleSubmit = () => {
    if (selectedIds.length > 0) {
      onSelect(selectedIds)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '高バイラル'
    if (score >= 60) return '中バイラル'
    return '低バイラル'
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">
              GPTが生成したコンセプト候補
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              最大3つまで選択できます（{selectedIds.length}/3）
            </p>
          </div>
        </div>
      </div>

      {/* コンセプトリスト */}
      <div className="space-y-4">
        {concepts.map((concept) => (
          <div
            key={concept.conceptId}
            className={`
              relative bg-white rounded-lg border-2 transition-all
              ${selectedIds.includes(concept.conceptId)
                ? 'border-purple-500 shadow-lg'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            {/* 選択チェックボックス */}
            <div className="absolute top-4 right-4">
              <input
                type="checkbox"
                checked={selectedIds.includes(concept.conceptId)}
                onChange={() => toggleSelection(concept.conceptId)}
                disabled={isLoading || (!selectedIds.includes(concept.conceptId) && selectedIds.length >= 3)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {/* コンセプト内容 */}
            <div className="p-4 pr-16">
              {/* タイトル */}
              <h4 className="font-semibold text-lg text-gray-900 mb-2">
                {concept.conceptTitle}
              </h4>

              {/* フックとアングル */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  <Target className="inline w-3 h-3 mr-1" />
                  {concept.selectedHook}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  {concept.selectedAngle}
                </span>
              </div>

              {/* バイラルスコア */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-gray-600">バイラルスコア:</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full w-32 relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-purple-600 rounded-full transition-all"
                      style={{ width: `${concept.viralScore}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${getScoreColor(concept.viralScore)}`}>
                    {concept.viralScore}点 - {getScoreLabel(concept.viralScore)}
                  </span>
                </div>
              </div>

              {/* 詳細表示トグル */}
              <button
                onClick={() => setShowDetails(showDetails === concept.conceptId ? null : concept.conceptId)}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                {showDetails === concept.conceptId ? '詳細を隠す' : '詳細を見る'}
              </button>

              {/* 詳細情報 */}
              {showDetails === concept.conceptId && (
                <div className="mt-4 space-y-3">
                  {/* 理由 */}
                  {concept.reasoning && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">選択理由</p>
                      <p className="text-sm text-gray-600">{concept.reasoning}</p>
                    </div>
                  )}

                  {/* 構造 */}
                  {concept.structure && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">投稿構造</p>
                      <div className="space-y-2 text-sm">
                        {concept.structure.hook && (
                          <div>
                            <span className="font-medium text-gray-600">フック:</span>
                            <p className="text-gray-600 ml-4">{concept.structure.hook}</p>
                          </div>
                        )}
                        {concept.structure.background && (
                          <div>
                            <span className="font-medium text-gray-600">背景:</span>
                            <p className="text-gray-600 ml-4">{concept.structure.background}</p>
                          </div>
                        )}
                        {concept.structure.mainContent && (
                          <div>
                            <span className="font-medium text-gray-600">メイン:</span>
                            <p className="text-gray-600 ml-4">{concept.structure.mainContent}</p>
                          </div>
                        )}
                        {concept.structure.callToAction && (
                          <div>
                            <span className="font-medium text-gray-600">CTA:</span>
                            <p className="text-gray-600 ml-4">{concept.structure.callToAction}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 選択状態の警告 */}
      {selectedIds.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              少なくとも1つのコンセプトを選択してください
            </p>
          </div>
        </div>
      )}

      {/* 確認ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading || selectedIds.length === 0}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${!isLoading && selectedIds.length > 0
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? '処理中...' : `選択したコンセプトで続行（${selectedIds.length}個）`}
        </button>
      </div>
    </div>
  )
}