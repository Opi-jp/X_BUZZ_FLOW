'use client'

import { useState } from 'react'

export default function ViralTestDashboard() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async (endpoint: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(endpoint, {
        method: endpoint.includes('analyze-trends') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.includes('analyze-trends') ? JSON.stringify({
          forceRefresh: true
        }) : undefined
      })

      let data
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (jsonError) {
          const text = await response.text()
          setError(`JSONパースエラー: ${jsonError}. レスポンス: ${text.substring(0, 200)}...`)
          return
        }
      } else {
        const text = await response.text()
        setError(`予期しないレスポンス形式 (${contentType}): ${text.substring(0, 200)}...`)
        return
      }
      
      if (!response.ok) {
        setError(`エラー ${response.status}: ${data.error || JSON.stringify(data)}`)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(`ネットワークエラー: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">バイラルシステム APIテスト</h1>

      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
        <p className="font-bold">注意</p>
        <p>データベースマイグレーションが必要な場合があります。</p>
        <p>エラーが発生した場合は、Vercelのログを確認してください。</p>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">API エンドポイントテスト</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => testAPI('/api/viral/analyze-trends')}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              トレンド分析 API テスト
            </button>
            
            <button
              onClick={() => testAPI('/api/viral/workflow/auto-generate')}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              ワークフロー API テスト (GET)
            </button>
            
            <button
              onClick={() => testAPI('/api/viral/health')}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              ヘルスチェック
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-4">
            <p>処理中...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">エラー</p>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">レスポンス</h3>
            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded">
        <h3 className="font-semibold mb-2">トラブルシューティング</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>「relation does not exist」エラー: データベースマイグレーションが必要</li>
          <li>「OPENAI_API_KEY is not defined」エラー: Vercel環境変数の設定が必要</li>
          <li>「401 Unauthorized」エラー: Twitter認証が必要</li>
        </ul>
      </div>
    </div>
  )
}