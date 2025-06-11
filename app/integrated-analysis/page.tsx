'use client'

import { useState } from 'react'

export default function IntegratedAnalysisPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runIntegratedAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/insights/integrated-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
      <h1 className="text-3xl font-bold mb-8">🧠 本当の統合分析（収集データ×Perplexity）</h1>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <p className="text-sm">
          <strong>これが本当の統合です：</strong><br/>
          実際に収集したバズツイートとニュースデータをPerplexityに渡して、具体的な分析と提案を生成します。
        </p>
      </div>
      
      <button
        onClick={runIntegratedAnalysis}
        disabled={loading}
        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-medium text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 mb-8"
      >
        {loading ? '🔄 実データで分析中...' : '🚀 収集データ×Perplexityで統合分析'}
      </button>

      {result && (
        <div className="space-y-6">
          {/* エラー表示 */}
          {result.error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">
              <p className="font-bold">エラー:</p>
              <p>{result.error}</p>
              {result.suggestion && (
                <p className="mt-2 text-sm">{result.suggestion}</p>
              )}
            </div>
          )}

          {/* 使用データ */}
          {result.dataUsed && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="font-bold mb-2">📊 分析に使用したデータ</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">バズツイート:</span> {result.dataUsed.buzzPosts}件
                </div>
                <div>
                  <span className="font-medium">ニュース記事:</span> {result.dataUsed.newsArticles}件
                </div>
                <div>
                  <span className="font-medium">期間:</span> {result.dataUsed.timeRange}
                </div>
              </div>
            </div>
          )}

          {/* Perplexity分析結果 */}
          {result.analysis && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">🧠 Perplexityによる統合分析</h2>
              <div className="whitespace-pre-wrap text-sm bg-white p-4 rounded">
                {result.analysis}
              </div>
            </div>
          )}

          {/* トップデータ */}
          {result.rawData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.rawData.topBuzzPost && (
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">🔥 最もバズったツイート</h3>
                  <p className="text-sm">@{result.rawData.topBuzzPost.authorUsername}</p>
                  <p className="text-xs mt-1">{result.rawData.topBuzzPost.content}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {result.rawData.topBuzzPost.likesCount.toLocaleString()}いいね
                  </p>
                </div>
              )}
              
              {result.rawData.topNews && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold mb-2">📰 最重要ニュース</h3>
                  <p className="text-sm font-medium">{result.rawData.topNews.title}</p>
                  <p className="text-xs text-gray-600 mt-2">ソースID: {result.rawData.topNews.sourceId}</p>
                </div>
              )}
            </div>
          )}

          {/* アクションアイテム */}
          {result.actionItems && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h2 className="font-bold mb-2">⚡ 今すぐやること</h2>
              <ul className="space-y-2">
                {result.actionItems.map((item: any, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-2 ${
                      item.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                    <span className="text-sm">{item.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}