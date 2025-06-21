'use client'

import { useState } from 'react'
import { Globe, TrendingUp, Lightbulb, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPresets } from '@/lib/utils/date-jst'

interface Topic {
  title: string
  summary: string
  source?: string
  url?: string
  relevance?: number
  perplexityAnalysis?: string
}

interface TopicsDisplayStepProps {
  topics: Topic[] | string
  rawData?: any
  onConfirm: () => void
  isLoading?: boolean
}

export function TopicsDisplayStep({ topics, rawData, onConfirm, isLoading }: TopicsDisplayStepProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [showRawData, setShowRawData] = useState(false)

  // topicsがstring形式の場合の処理
  const topicList: Topic[] = typeof topics === 'string' 
    ? parseTopicsFromString(topics)
    : topics

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Globe className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">
              Perplexityが収集した最新トピック
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              AIが分析した現在のトレンドと注目情報です
            </p>
          </div>
        </div>
      </div>

      {/* トピックリスト */}
      <div className="space-y-3">
        {topicList.map((topic, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* トピックヘッダー */}
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3 text-left">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full text-purple-600 font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {topic.title}
                  </h4>
                  {topic.relevance && (
                    <div className="flex items-center gap-2 mt-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-sm text-green-600">
                        関連度: {Math.round(topic.relevance * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {expandedIndex === index ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* 展開コンテンツ */}
            {expandedIndex === index && (
              <div className="px-4 py-3 border-t border-gray-100 space-y-3">
                {/* サマリー */}
                <div>
                  <p className="text-sm text-gray-600">
                    {topic.summary}
                  </p>
                </div>

                {/* Perplexity分析 */}
                {topic.perplexityAnalysis && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          AI分析
                        </p>
                        <p className="text-sm text-blue-700">
                          {topic.perplexityAnalysis}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ソース情報 */}
                {(topic.source || topic.url) && (
                  <div className="flex items-center gap-2 text-sm">
                    {topic.source && (
                      <span className="text-gray-500">
                        出典: {topic.source}
                      </span>
                    )}
                    {topic.url && (
                      <a
                        href={topic.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        詳細を見る
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 生データ表示トグル */}
      {rawData && (
        <div className="mt-6">
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            {showRawData ? (
              <>
                <ChevronUp className="w-4 h-4" />
                生データを隠す
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                生データを表示
              </>
            )}
          </button>
          
          {showRawData && (
            <div className="mt-3 bg-gray-100 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs font-mono">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 確認ボタン */}
      <div className="flex justify-end">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${!isLoading
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? '処理中...' : '次へ：コンセプト生成'}
        </button>
      </div>
    </div>
  )
}

// topicsが文字列形式の場合のパース処理
function parseTopicsFromString(topicsString: string): Topic[] {
  // 簡易的なパース処理
  // 実際の形式に応じて調整が必要
  try {
    // JSONとして解析を試みる
    const parsed = JSON.parse(topicsString)
    if (Array.isArray(parsed)) {
      return parsed
    }
    
    // オブジェクトの場合、topics配列を探す
    if (parsed.topics && Array.isArray(parsed.topics)) {
      return parsed.topics
    }
  } catch (e) {
    // JSON解析失敗時は文字列を単一トピックとして扱う
  }
  
  return [{
    title: 'トピック情報',
    summary: topicsString,
  }]
}