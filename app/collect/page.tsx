'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/layout/Sidebar'
import { getNowJST, formatDateJST } from '@/lib/date-utils'

interface CollectionPreset {
  id: string
  name: string
  description: string | null
  query: string
  keywords: string[]
  minLikes: number
  minRetweets: number
  category: string
}

export default function CollectPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [collectType, setCollectType] = useState<'preset' | 'custom' | 'user'>('preset')
  const [presets, setPresets] = useState<CollectionPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [query, setQuery] = useState('')
  const [username, setUsername] = useState('')
  const [minLikes, setMinLikes] = useState('1000')
  const [minRetweets, setMinRetweets] = useState('100')
  const [maxItems, setMaxItems] = useState('20')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [date, setDate] = useState(formatDateJST(getNowJST()))

  useEffect(() => {
    fetchPresets()
  }, [])

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/collection-presets')
      const data = await res.json()
      setPresets(data)
      if (data.length > 0) {
        setSelectedPreset(data[0].id)
        applyPreset(data[0])
      }
    } catch (error) {
      console.error('Error fetching presets:', error)
    }
  }

  const applyPreset = (preset: CollectionPreset) => {
    setQuery(preset.keywords.join(' '))
    setMinLikes(preset.minLikes.toString())
    setMinRetweets(preset.minRetweets.toString())
  }

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = presets.find(p => p.id === presetId)
    if (preset) {
      applyPreset(preset)
    }
  }

  const handleCollect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      let finalQuery = ''
      
      if (collectType === 'preset') {
        const preset = presets.find(p => p.id === selectedPreset)
        if (preset) {
          finalQuery = preset.keywords.join(' OR ')
        }
      } else if (collectType === 'custom') {
        finalQuery = query
      } else {
        finalQuery = `from:${username || session?.user?.name} -filter:replies`
      }

      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: finalQuery,
          minLikes: parseInt(minLikes),
          minRetweets: parseInt(minRetweets),
          maxItems: parseInt(maxItems),
          date: date,
          excludeReplies: true, // リプライを除外
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
              AI関連のバズツイートを収集します（@リプライは自動除外）
            </p>
          </div>

          <form onSubmit={handleCollect} className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              {/* 収集タイプ選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  収集タイプ
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="preset"
                      checked={collectType === 'preset'}
                      onChange={(e) => setCollectType('preset')}
                      className="mr-2"
                    />
                    プリセット
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="custom"
                      checked={collectType === 'custom'}
                      onChange={(e) => setCollectType('custom')}
                      className="mr-2"
                    />
                    カスタム検索
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="user"
                      checked={collectType === 'user'}
                      onChange={(e) => setCollectType('user')}
                      className="mr-2"
                    />
                    ユーザータイムライン
                  </label>
                </div>
              </div>

              {collectType === 'preset' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プリセット選択
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} - {preset.description}
                      </option>
                    ))}
                  </select>
                  
                  {selectedPreset && (
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">
                        <strong>キーワード:</strong> {presets.find(p => p.id === selectedPreset)?.keywords.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {collectType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    検索クエリ
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="例: AI OR ChatGPT OR Claude"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ORで複数キーワードを指定できます
                  </p>
                </div>
              )}

              {collectType === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ユーザー名（@なし）
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={session?.user?.name || "username"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    空欄の場合は自分のアカウントから収集します（@リプライは除外）
                  </p>
                </div>
              )}

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  収集開始日（この日付以降のツイートを収集）
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  {result.skipped > 0 && (
                    <p className="text-green-500 text-sm">
                      （{result.skipped}件はリプライのため除外）
                    </p>
                  )}
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
            <p className="text-amber-700 text-sm mt-2">
              <strong>@リプライの除外:</strong> ユーザータイムラインから収集する際、
              @で始まるリプライツイートは自動的に除外されます。
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}