'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/components/layout/AppLayout'
import { Brain, TrendingUp, Target, Lightbulb, RefreshCw } from 'lucide-react'

interface Insight {
  id: string
  category: 'performance' | 'content' | 'timing' | 'engagement'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable: string
}

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      // TODO: 実際のAPIエンドポイントに置き換え
      const mockInsights: Insight[] = [
        {
          id: '1',
          category: 'performance',
          title: '午後7-9時の投稿が最も効果的',
          description: '過去30日間のデータ分析により、午後7時から9時の間に投稿したコンテンツは、他の時間帯と比べて平均45%高いエンゲージメント率を記録しています。',
          impact: 'high',
          actionable: 'この時間帯に重要なコンテンツをスケジュールすることをお勧めします。'
        },
        {
          id: '2',
          category: 'content',
          title: '質問形式の投稿がエンゲージメントを促進',
          description: '「〜についてどう思いますか？」などの質問を含む投稿は、通常の投稿より3倍のコメントを獲得しています。',
          impact: 'high',
          actionable: '各投稿に読者への質問を含めることを検討してください。'
        },
        {
          id: '3',
          category: 'timing',
          title: '週末の投稿頻度を増やす余地あり',
          description: '土日の投稿数が平日の半分以下ですが、週末の投稿は平均的に高いエンゲージメントを獲得しています。',
          impact: 'medium',
          actionable: '週末用のコンテンツを事前に準備し、スケジュール投稿を活用しましょう。'
        },
        {
          id: '4',
          category: 'engagement',
          title: 'ビジュアルコンテンツの追加で注目度UP',
          description: '画像や動画を含む投稿は、テキストのみの投稿より平均65%多いインプレッションを獲得しています。',
          impact: 'high',
          actionable: '各投稿に関連する画像やインフォグラフィックの追加を検討してください。'
        }
      ]
      setInsights(mockInsights)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateNewInsights = async () => {
    setGenerating(true)
    try {
      // TODO: AI分析APIを呼び出し
      await new Promise(resolve => setTimeout(resolve, 3000))
      await fetchInsights()
    } finally {
      setGenerating(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return <TrendingUp className="w-5 h-5" />
      case 'content': return <Lightbulb className="w-5 h-5" />
      case 'timing': return <Target className="w-5 h-5" />
      case 'engagement': return <Brain className="w-5 h-5" />
      default: return null
    }
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Brain className="w-8 h-8 mr-3 text-purple-500" />
              AIインサイト
            </h1>
            <p className="mt-2 text-gray-600">
              AIがあなたの投稿データを分析し、改善提案を提供します
            </p>
          </div>
          <button
            onClick={generateNewInsights}
            disabled={generating}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            新しいインサイトを生成
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">インサイトを分析中...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg mr-3">
                    {getCategoryIcon(insight.category)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getImpactColor(insight.impact)}`}>
                      {insight.impact === 'high' ? '高インパクト' : 
                       insight.impact === 'medium' ? '中インパクト' : '低インパクト'}
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">{insight.description}</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">💡 推奨アクション</p>
                <p className="text-sm text-blue-800">{insight.actionable}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">分析サマリー</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">分析期間</p>
            <p className="text-xl font-bold text-gray-900">過去30日間</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">分析投稿数</p>
            <p className="text-xl font-bold text-gray-900">89件</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600">改善可能性</p>
            <p className="text-xl font-bold text-green-600">+35%</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}