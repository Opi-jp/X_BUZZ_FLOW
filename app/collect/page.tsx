'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default function CollectPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [minLikes, setMinLikes] = useState('1000')
  const [minRetweets, setMinRetweets] = useState('100')
  const [maxItems, setMaxItems] = useState('20')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          minLikes: parseInt(minLikes),
          minRetweets: parseInt(minRetweets),
          maxItems: parseInt(maxItems),
        }),
      })

      const data = await res.json()
      setResult(data)
      
      if (data.saved > 0) {
        setTimeout(() => {
          router.push('/posts')
        }, 2000)
      }
    } catch (error) {
      console.error('Error collecting posts:', error)
      setResult({ error: '収集中にエラーが発生しました' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">バズ投稿収集</h1>
            <p className="mt-1 text-sm text-gray-600">
              Kaito APIを使用してX（Twitter）からバズ投稿を収集します
            </p>
          </div>

          <form onSubmit={handleCollect} className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  検索クエリ
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="例: AI, ChatGPT, プログラミング"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小いいね数
                  </label>
                  <input
                    type="number"
                    value={minLikes}
                    onChange={(e) => setMinLikes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小リツイート数
                  </label>
                  <input
                    type="number"
                    value={minRetweets}
                    onChange={(e) => setMinRetweets(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大取得件数
                  </label>
                  <input
                    type="number"
                    value={maxItems}
                    onChange={(e) => setMaxItems(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '収集中...' : '収集開始'}
              </button>
            </div>
          </form>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.error ? 'bg-red-50' : 'bg-green-50'}`}>
              {result.error ? (
                <p className="text-red-700">{result.error}</p>
              ) : (
                <div>
                  <p className="text-green-700 font-semibold">
                    収集完了！
                  </p>
                  <p className="text-green-600 mt-1">
                    {result.collected}件中{result.saved}件を保存しました
                  </p>
                  <p className="text-green-500 text-sm mt-2">
                    投稿一覧ページに移動します...
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 bg-amber-50 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              <strong>注意:</strong> Kaito API（Apify）の利用には制限があります。
              過度な使用は避けてください。
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}