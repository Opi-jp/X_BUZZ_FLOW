'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateJST, formatDateTimeJST } from '@/lib/date-utils'

interface BuzzPost {
  id: string
  postId: string
  content: string
  authorUsername: string
  authorId?: string
  authorFollowers?: number
  authorFollowing?: number
  authorVerified?: boolean | null
  likesCount: number
  retweetsCount: number
  impressionsCount: number
  postedAt: string
  collectedAt: string
  theme: string
  url: string
}

interface GroupedPosts {
  date: string
  posts: BuzzPost[]
}

export default function PostsPage() {
  const [posts, setPosts] = useState<BuzzPost[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [viewMode, setViewMode] = useState<'all' | 'daily'>('daily')
  const [sortBy, setSortBy] = useState<'engagement' | 'likes' | 'retweets' | 'recent'>('engagement')

  useEffect(() => {
    fetchPosts()
  }, [theme])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (theme) params.append('theme', theme)
      
      const res = await fetch(`/api/buzz-posts?${params}`)
      const data = await res.json()
      setPosts(data.posts)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (dateString: string, includeTime = true) => {
    return includeTime ? formatDateTimeJST(dateString) : formatDateJST(dateString)
  }

  // エンゲージメント率を計算
  const calculateEngagementRate = (post: BuzzPost) => {
    if (post.impressionsCount === 0) return 0
    const totalEngagement = post.likesCount + post.retweetsCount
    return (totalEngagement / post.impressionsCount) * 100
  }

  // ソート処理
  const sortPosts = (posts: BuzzPost[]) => {
    return [...posts].sort((a, b) => {
      switch (sortBy) {
        case 'engagement':
          return calculateEngagementRate(b) - calculateEngagementRate(a)
        case 'likes':
          return b.likesCount - a.likesCount
        case 'retweets':
          return b.retweetsCount - a.retweetsCount
        case 'recent':
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        default:
          return 0
      }
    })
  }

  // 日付でグループ化
  const groupPostsByDate = (posts: BuzzPost[]): GroupedPosts[] => {
    const sorted = sortPosts(posts)
    const grouped = sorted.reduce((acc, post) => {
      const date = formatDate(post.collectedAt, false)
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(post)
      return acc
    }, {} as Record<string, BuzzPost[]>)

    return Object.entries(grouped)
      .map(([date, posts]) => ({ date, posts }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // 利用可能な日付リストを取得
  const availableDates = [...new Set(posts.map(post => formatDate(post.collectedAt, false)))]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // フィルタリングされた投稿
  const filteredPosts = viewMode === 'daily' && selectedDate
    ? posts.filter(post => formatDate(post.collectedAt, false) === selectedDate)
    : posts

  const sortedPosts = sortPosts(filteredPosts)

  // ウォッチリストに追加
  const addToWatchlist = async (post: BuzzPost) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: post.authorUsername,
          twitterId: post.authorId || '',
          displayName: post.authorUsername,
          profileImageUrl: ''
        }),
      })
      if (res.ok) {
        alert(`@${post.authorUsername} をウォッチリストに追加しました`)
      } else {
        const data = await res.json()
        if (data.error) {
          alert(data.error)
        }
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      alert('ウォッチリストへの追加に失敗しました')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">バズ投稿分析</h1>
        <p className="mt-1 text-sm text-gray-600">
          エンゲージメント率の高い投稿を分析し、戦略を立てましょう
        </p>
      </div>

      {/* ソートと表示モード */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="flex bg-white rounded-lg shadow-sm">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                viewMode === 'daily' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              日別表示
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                viewMode === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              全て表示
            </button>
          </div>

          {viewMode === 'daily' && (
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">日付を選択</option>
              {availableDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="engagement">エンゲージメント率順</option>
            <option value="likes">いいね数順</option>
            <option value="retweets">RT数順</option>
            <option value="recent">投稿日時順</option>
          </select>

          <input
            type="text"
            placeholder="テーマでフィルター"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => window.location.href = '/watchlist'}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            ウォッチリスト
          </button>
          <button
            onClick={() => window.location.href = '/collect'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            新規収集
          </button>
        </div>
      </div>

      {/* 投稿リスト */}
      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : sortedPosts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">投稿がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              formatDate={formatDate} 
              formatNumber={formatNumber}
              calculateEngagementRate={calculateEngagementRate}
              addToWatchlist={addToWatchlist}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 投稿カードコンポーネント
function PostCard({ 
  post, 
  formatDate, 
  formatNumber,
  calculateEngagementRate,
  addToWatchlist
}: { 
  post: BuzzPost
  formatDate: (date: string, includeTime?: boolean) => string
  formatNumber: (num: number) => string
  calculateEngagementRate: (post: BuzzPost) => number
  addToWatchlist: (post: BuzzPost) => void
}) {
  const engagementRate = calculateEngagementRate(post)
  const isHighEngagement = engagementRate > 5 // 5%以上を高エンゲージメントとする

  const [showQuickGenerate, setShowQuickGenerate] = useState(false)
  const [quickGenerating, setQuickGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [showUserInfo, setShowUserInfo] = useState(false)

  const handleQuickGenerate = async (action: 'quote' | 'inspire') => {
    setQuickGenerating(true)
    try {
      const prompt = action === 'quote' 
        ? `以下の投稿を引用RTして、価値のあるコメントを追加してください。クリエイティブディレクターの視点で、LLM活用の観点を含めてください。140文字以内で。\n\n${post.content}`
        : `以下の投稿を参考に、似たテーマで新しい投稿を作成してください。クリエイティブディレクターの視点で、独自の見解を含めてください。140文字以内で。\n\n${post.content}`

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPrompt: prompt }),
      })

      const data = await res.json()
      setGeneratedContent(data.generatedContent)
      setShowQuickGenerate(true)
    } catch (error) {
      console.error('Error generating content:', error)
      alert('生成中にエラーが発生しました')
    } finally {
      setQuickGenerating(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isHighEngagement ? 'border-2 border-green-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1"
                >
                  @{post.authorUsername}
                  <svg className={`w-4 h-4 transition-transform ${showUserInfo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <span className="text-sm text-gray-500">
                  {formatDate(post.postedAt)}
                </span>
                {isHighEngagement && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                    高エンゲージメント
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {post.theme}
                </span>
              </div>
              {post.authorVerified && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            {/* ユーザー情報ドロップダウン */}
            {showUserInfo && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">フォロワー</p>
                    <p className="font-semibold">{formatNumber(post.authorFollowers || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">フォロー中</p>
                    <p className="font-semibold">{formatNumber(post.authorFollowing || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">FF比</p>
                    <p className="font-semibold">
                      {post.authorFollowers && post.authorFollowing && post.authorFollowing > 0 
                        ? (post.authorFollowers / post.authorFollowing).toFixed(2)
                        : '∞'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">平均エンゲージ率</p>
                    <p className="font-semibold">{engagementRate.toFixed(2)}%</p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="text-gray-600">
                        {post.authorFollowers && post.authorFollowers >= 10000 ? '🏆 インフルエンサー' : 
                         post.authorFollowers && post.authorFollowers >= 1000 ? '⭐ マイクロインフルエンサー' : 
                         '📱 一般ユーザー'}
                      </p>
                      {post.authorFollowers && post.authorFollowing && post.authorFollowers / post.authorFollowing > 10 && (
                        <p className="text-green-600 mt-1">✨ 高影響力（FF比 10以上）</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addToWatchlist(post)
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
                    >
                      Watchリストに追加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-gray-800 whitespace-pre-wrap mb-4">{post.content}</p>
          
          {/* メトリクス */}
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-600">
              👁 {formatNumber(post.impressionsCount)}
            </span>
            <span className="text-gray-600">
              ❤️ {formatNumber(post.likesCount)}
            </span>
            <span className="text-gray-600">
              🔄 {formatNumber(post.retweetsCount)}
            </span>
            <span className={`font-semibold ${isHighEngagement ? 'text-green-600' : 'text-gray-600'}`}>
              📊 {engagementRate.toFixed(2)}%
            </span>
          </div>
        </div>
        
        <div className="ml-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <Link
              href={`/create?refPostId=${post.id}&action=quote`}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium flex items-center gap-1"
              title="このツイートを引用してAI生成"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
              </svg>
              引用生成
            </Link>
            <Link
              href={`/create?refPostId=${post.id}&action=inspire`}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium flex items-center gap-1"
              title="このツイートを参考にAI生成"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              参考生成
            </Link>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addToWatchlist(post)}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
            >
              Watch
            </button>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-xs"
            >
              元投稿
            </a>
          </div>
        </div>
      </div>
      
      {/* クイック生成結果表示 */}
      {showQuickGenerate && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-sm">AI生成結果</h4>
            <button
              onClick={() => setShowQuickGenerate(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <textarea
            value={generatedContent}
            onChange={(e) => setGeneratedContent(e.target.value)}
            className="w-full p-3 border rounded-md mb-3 text-sm"
            rows={4}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedContent)
                alert('クリップボードにコピーしました')
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              コピー
            </button>
            <button
              onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedContent)}`, '_blank')}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              投稿する
            </button>
            <Link
              href={`/create?refPostId=${post.id}&content=${encodeURIComponent(generatedContent)}`}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
            >
              詳細編集
            </Link>
          </div>
        </div>
      )}
      
      {/* クイック生成ボタン（インライン） */}
      {!showQuickGenerate && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleQuickGenerate('quote')}
            disabled={quickGenerating}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs disabled:opacity-50"
          >
            {quickGenerating ? '生成中...' : 'クイック引用生成'}
          </button>
          <button
            onClick={() => handleQuickGenerate('inspire')}
            disabled={quickGenerating}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs disabled:opacity-50"
          >
            {quickGenerating ? '生成中...' : 'クイック参考生成'}
          </button>
        </div>
      )}
    </div>
  )
}