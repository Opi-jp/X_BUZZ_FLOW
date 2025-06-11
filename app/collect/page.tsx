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

interface WatchlistUser {
  id: string
  username: string
  displayName: string
  profileImage: string | null
  lastChecked: Date | null
  _count: {
    tweets: number
  }
}

export default function CollectPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [collectType, setCollectType] = useState<'preset' | 'custom' | 'user' | 'watchlist'>('preset')
  const [presets, setPresets] = useState<CollectionPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [watchlistUsers, setWatchlistUsers] = useState<WatchlistUser[]>([])
  const [selectedWatchlistUsers, setSelectedWatchlistUsers] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [username, setUsername] = useState('')
  const [minLikes, setMinLikes] = useState('1000')
  const [minRetweets, setMinRetweets] = useState('100')
  const [minEngagementRate, setMinEngagementRate] = useState('0')
  const [maxItems, setMaxItems] = useState('20')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [collectedPosts, setCollectedPosts] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [date, setDate] = useState(formatDateJST(getNowJST()))

  useEffect(() => {
    fetchPresets()
    if (collectType === 'watchlist') {
      fetchWatchlistUsers()
    }
  }, [collectType])

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

  const fetchWatchlistUsers = async () => {
    try {
      const res = await fetch('/api/watchlist')
      const data = await res.json()
      setWatchlistUsers(data)
    } catch (error) {
      console.error('Error fetching watchlist users:', error)
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
      } else if (collectType === 'user') {
        finalQuery = `from:${username || session?.user?.name} -filter:replies`
      } else if (collectType === 'watchlist') {
        // ウォッチリストから収集
        if (selectedWatchlistUsers.length === 0) {
          setResult({ error: 'ユーザーを選択してください' })
          setLoading(false)
          return
        }

        let totalCollected = 0
        let totalSaved = 0
        let allCollectedPosts: any[] = []
        
        for (const userId of selectedWatchlistUsers) {
          const user = watchlistUsers.find(u => u.id === userId)
          if (!user) continue

          const res = await fetch('/api/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `from:${user.username} -filter:replies`,
              minLikes: parseInt(minLikes),
              minRetweets: parseInt(minRetweets),
              minEngagementRate: parseFloat(minEngagementRate),
              maxItems: parseInt(maxItems),
              date: date,
              excludeReplies: true,
            }),
          })

          const data = await res.json()
          if (data.collected) totalCollected += data.collected
          if (data.saved) totalSaved += data.saved
          if (data.posts) allCollectedPosts = [...allCollectedPosts, ...data.posts]
        }

        setResult({ collected: totalCollected, saved: totalSaved })
        
        if (allCollectedPosts.length > 0) {
          setCollectedPosts(allCollectedPosts)
          setShowPreview(true)
        }
        
        if (totalSaved > 0 && !showPreview) {
          setTimeout(() => {
            router.push('/posts')
          }, 2000)
        }
        return
      }

      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: finalQuery,
          minLikes: parseInt(minLikes),
          minRetweets: parseInt(minRetweets),
          minEngagementRate: parseFloat(minEngagementRate),
          maxItems: parseInt(maxItems),
          date: date,
          excludeReplies: true, // リプライを除外
        }),
      })

      const data = await res.json()
      setResult(data)
      
      // 収集した投稿を保存
      if (data.posts && data.posts.length > 0) {
        setCollectedPosts(data.posts)
        setShowPreview(true)
      }
      
      if (data.saved > 0 && !showPreview) {
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
                      onChange={(e) => setCollectType('preset' as any)}
                      className="mr-2"
                    />
                    プリセット
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="custom"
                      checked={collectType === 'custom'}
                      onChange={(e) => setCollectType('custom' as any)}
                      className="mr-2"
                    />
                    カスタム検索
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="user"
                      checked={collectType === 'user'}
                      onChange={(e) => setCollectType('user' as any)}
                      className="mr-2"
                    />
                    ユーザータイムライン
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="watchlist"
                      checked={collectType === 'watchlist'}
                      onChange={(e) => setCollectType('watchlist' as any)}
                      className="mr-2"
                    />
                    ウォッチリスト
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

              {collectType === 'watchlist' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ウォッチリストユーザー（複数選択可）
                  </label>
                  {watchlistUsers.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-md text-gray-500 text-sm">
                      ウォッチリストにユーザーが登録されていません。
                      <br />
                      バズ投稿一覧からユーザーを追加してください。
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {watchlistUsers.map((user) => (
                        <label key={user.id} className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            value={user.id}
                            checked={selectedWatchlistUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWatchlistUsers([...selectedWatchlistUsers, user.id])
                              } else {
                                setSelectedWatchlistUsers(selectedWatchlistUsers.filter(id => id !== user.id))
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex-1">
                            <span className="font-medium">@{user.username}</span>
                            {user.displayName && (
                              <span className="text-gray-500 ml-2">{user.displayName}</span>
                            )}
                            <span className="text-xs text-gray-400 ml-2">
                              ({user._count.tweets}件)
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    選択したユーザーから最新ツイートを収集します
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小エンゲージメント率 (%)
                  </label>
                  <input
                    type="number"
                    value={minEngagementRate}
                    onChange={(e) => setMinEngagementRate(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    0の場合はフィルタリングしません
                  </p>
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
                  {showPreview ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setShowPreview(false)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        プレビューを閉じる
                      </button>
                      <button
                        onClick={() => router.push('/posts')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        投稿一覧へ移動
                      </button>
                    </div>
                  ) : (
                    <p className="text-green-500 text-sm mt-2">
                      投稿一覧ページに移動します...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 収集結果プレビュー */}
          {showPreview && collectedPosts.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">収集結果プレビュー</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {collectedPosts.map((post) => {
                  const engagementRate = post.impressionsCount > 0
                    ? ((post.likesCount + post.retweetsCount + post.repliesCount) / post.impressionsCount * 100).toFixed(2)
                    : '0'
                  
                  return (
                    <div key={post.id} className="border-b pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">@{post.authorUsername}</p>
                          <p className="mt-1 text-gray-700 whitespace-pre-wrap">{post.content}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <span>❤️ {post.likesCount.toLocaleString()}</span>
                            <span>🔄 {post.retweetsCount.toLocaleString()}</span>
                            <span>💬 {post.repliesCount.toLocaleString()}</span>
                            <span>👁️ {post.impressionsCount.toLocaleString()}</span>
                            <span className="font-medium text-blue-600">
                              エンゲージメント率: {engagementRate}%
                            </span>
                          </div>
                        </div>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 text-blue-500 hover:text-blue-700"
                        >
                          表示
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
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