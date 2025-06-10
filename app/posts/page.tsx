'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BuzzPost {
  id: string
  postId: string
  content: string
  authorUsername: string
  likesCount: number
  retweetsCount: number
  impressionsCount: number
  postedAt: string
  theme: string
  url: string
}

export default function PostsPage() {
  const [posts, setPosts] = useState<BuzzPost[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('')

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">バズ投稿一覧</h1>
        <p className="mt-1 text-sm text-gray-600">
          収集したバズ投稿を確認できます
        </p>
      </div>

      {/* フィルター */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="テーマでフィルター"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">投稿がありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow p-6">
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
          ))}
        </div>
      )}
    </div>
  )
}