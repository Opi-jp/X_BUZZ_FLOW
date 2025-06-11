'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateJST, formatDateTimeJST } from '@/lib/date-utils'

interface BuzzPost {
  id: string
  postId: string
  content: string
  authorUsername: string
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
  const addToWatchlist = async (username: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (res.ok) {
        alert(`@${username} をウォッチリストに追加しました`)
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
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
  addToWatchlist: (username: string) => void
}) {
  const engagementRate = calculateEngagementRate(post)
  const isHighEngagement = engagementRate > 5 // 5%以上を高エンゲージメントとする

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isHighEngagement ? 'border-2 border-green-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900">
              @{post.authorUsername}
            </span>
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
          <button
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`これは興味深い！\n\n`)}&url=${encodeURIComponent(post.url)}`, '_blank')}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            引用RT
          </button>
          <button
            onClick={() => addToWatchlist(post.authorUsername)}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            Watch
          </button>
          <Link
            href={`/create?refPostId=${post.id}`}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm text-center"
          >
            参考作成
          </Link>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm text-center"
          >
            元投稿
          </a>
        </div>
      </div>
    </div>
  )
}