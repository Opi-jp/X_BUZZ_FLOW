'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

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
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tokyo'
    }
    
    if (includeTime) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }
    
    return date.toLocaleDateString('ja-JP', options)
  }

  // 日付でグループ化
  const groupPostsByDate = (posts: BuzzPost[]): GroupedPosts[] => {
    const grouped = posts.reduce((acc, post) => {
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

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">バズ投稿一覧</h1>
            <p className="mt-1 text-sm text-gray-600">
              収集したバズ投稿を確認できます
            </p>
          </div>

          {/* 表示モード切り替え */}
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

              <input
                type="text"
                placeholder="テーマでフィルター"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={() => window.location.href = '/collect'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              新規収集
            </button>
          </div>

          {/* 投稿リスト */}
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">
                {viewMode === 'daily' && selectedDate 
                  ? `${selectedDate}の投稿はありません` 
                  : '投稿がありません'}
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'daily' && selectedDate && (
                <div className="mb-4 bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800">
                    <strong>{selectedDate}</strong> の投稿 
                    <span className="ml-2 text-blue-600 font-semibold">
                      ({filteredPosts.length}件)
                    </span>
                  </p>
                </div>
              )}
              
              {viewMode === 'daily' && !selectedDate ? (
                <div className="space-y-6">
                  {groupPostsByDate(posts).map(({ date, posts: datePosts }) => (
                    <div key={date}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {date}
                          <span className="ml-2 text-sm text-gray-500 font-normal">
                            ({datePosts.length}件)
                          </span>
                        </h3>
                        <button
                          onClick={() => setSelectedDate(date)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          この日付のみ表示
                        </button>
                      </div>
                      <div className="space-y-4">
                        {datePosts.slice(0, 3).map((post) => (
                          <PostCard key={post.id} post={post} formatDate={formatDate} formatNumber={formatNumber} />
                        ))}
                        {datePosts.length > 3 && (
                          <button
                            onClick={() => setSelectedDate(date)}
                            className="w-full py-2 text-center text-blue-600 hover:text-blue-800 bg-gray-50 rounded-lg"
                          >
                            残り{datePosts.length - 3}件を表示
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} formatDate={formatDate} formatNumber={formatNumber} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// 投稿カードコンポーネント
function PostCard({ 
  post, 
  formatDate, 
  formatNumber 
}: { 
  post: BuzzPost
  formatDate: (date: string, includeTime?: boolean) => string
  formatNumber: (num: number) => string
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900">
              @{post.authorUsername}
            </span>
            <span className="text-sm text-gray-500">
              {formatDate(post.postedAt)}
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
              {post.theme}
            </span>
          </div>
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
          <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
            <span>👁 {formatNumber(post.impressionsCount)}</span>
            <span>❤️ {formatNumber(post.likesCount)}</span>
            <span>🔄 {formatNumber(post.retweetsCount)}</span>
          </div>
        </div>
        <div className="ml-4 flex gap-2">
          <Link
            href={`/create?refPostId=${post.id}`}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            参考に作成
          </Link>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            元投稿
          </a>
        </div>
      </div>
    </div>
  )
}