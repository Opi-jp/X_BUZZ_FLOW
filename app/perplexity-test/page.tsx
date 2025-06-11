'use client'

import { useState } from 'react'

export default function PerplexityTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [query, setQuery] = useState('AI クリエイティブ 働き方 最新トレンド')

  const testPerplexity = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/perplexity/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          focus: 'creative_ai_trends'
        })
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: 'エラーが発生しました' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔥 Perplexity トレンドハンティング</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">検索クエリ</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-3 border rounded-lg"
          placeholder="検索したいトピックを入力"
        />
      </div>
      
      <button
        onClick={testPerplexity}
        disabled={loading}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
      >
        {loading ? '分析中...' : '🚀 Perplexityで分析'}
      </button>

      {result && (
        <div className="mt-8 space-y-6">
          {/* エラー表示 */}
          {result.error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">
              {result.error}
            </div>
          )}

          {/* 生の分析結果 */}
          {result.rawAnalysis && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">📊 Perplexity分析結果</h2>
              <div className="whitespace-pre-wrap text-sm">{result.rawAnalysis}</div>
            </div>
          )}

          {/* 構造化されたインサイト */}
          {result.structuredInsights && (
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">🎯 トレンド</h2>
              <ul className="space-y-2">
                {result.structuredInsights.trends?.map((trend: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="font-bold mr-2">{i + 1}.</span>
                    <span>{trend}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* あなたの独自視点 */}
          {result.personalAngles && result.personalAngles.length > 0 && (
            <div className="bg-purple-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">💡 あなたの独自視点</h2>
              <div className="space-y-4">
                {result.personalAngles.map((angle: any, i: number) => (
                  <div key={i} className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-bold">{angle.angle}</h3>
                    <p className="text-sm text-gray-700 mt-1">{angle.hook}</p>
                    <div className="mt-2 p-3 bg-white rounded">
                      <p className="text-sm font-medium">投稿テンプレート:</p>
                      <p className="text-sm mt-1">{angle.postTemplate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 推奨アクション */}
          {result.recommendations && (
            <div className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">🎬 今すぐやるべきこと</h2>
              
              {result.recommendations.immediateAction && (
                <div className="space-y-3">
                  {result.recommendations.immediateAction.map((action: any, i: number) => (
                    <div key={i} className={`p-3 rounded ${
                      action.priority === 'high' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <p className="font-medium">{action.action}</p>
                      <p className="text-sm text-gray-600">{action.timeframe}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* バズ予測 */}
          {result.buzzPrediction !== undefined && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">📈 バズ予測スコア</h2>
              <div className="text-3xl font-bold text-red-600">
                {(result.buzzPrediction * 100).toFixed(0)}%
              </div>
              <p className="text-sm text-gray-700 mt-2">
                このトピックがバズる可能性
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}