'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/layout/Sidebar'

interface ScheduledPost {
  id: string
  content: string
  editedContent?: string
  scheduledTime: string
  status: 'DRAFT' | 'SCHEDULED' | 'POSTED' | 'FAILED'
  postType: 'NEW' | 'RETWEET' | 'QUOTE'
  templateType?: string
  aiGenerated: boolean
  refPost?: {
    content: string
    authorUsername: string
  }
}

export default function SchedulePage() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [posting, setPosting] = useState<string | null>(null)

  useEffect(() => {
    fetchScheduledPosts()
  }, [statusFilter])

  const fetchScheduledPosts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      
      const res = await fetch(`/api/scheduled-posts?${params}`)
      const data = await res.json()
      setPosts(data.posts)
    } catch (error) {
      console.error('Error fetching scheduled posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePostStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/scheduled-posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        fetchScheduledPosts()
      }
    } catch (error) {
      console.error('Error updating post status:', error)
    }
  }

  const deletePost = async (id: string) => {
    if (!confirm('この投稿を削除しますか？')) return

    try {
      const res = await fetch(`/api/scheduled-posts/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchScheduledPosts()
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const postNow = async (id: string) => {
    if (!session) {
      alert('投稿するにはログインが必要です')
      return
    }

    setPosting(id)
    try {
      const res = await fetch('/api/post-tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledPostId: id }),
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(`投稿しました！\n${data.url}`)
        fetchScheduledPosts()
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('Error posting tweet:', error)
      alert('投稿中にエラーが発生しました')
    } finally {
      setPosting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      POSTED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
    }
    const labels = {
      DRAFT: '下書き',
      SCHEDULED: '予定',
      POSTED: '投稿済み',
      FAILED: '失敗',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getPostTypeLabel = (type: string) => {
    const labels = {
      NEW: '新規投稿',
      RETWEET: 'リツイート',
      QUOTE: '引用RT',
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">スケジュール管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              予定投稿の管理と編集ができます
            </p>
          </div>

          {/* フィルター */}
          <div className="mb-6 flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべてのステータス</option>
              <option value="DRAFT">下書き</option>
              <option value="SCHEDULED">予定</option>
              <option value="POSTED">投稿済み</option>
              <option value="FAILED">失敗</option>
            </select>
            <button
              onClick={() => window.location.href = '/create'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              新規作成
            </button>
          </div>

          {/* 投稿リスト */}
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">予定投稿がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusBadge(post.status)}
                        <span className="text-sm text-gray-600">
                          {getPostTypeLabel(post.postType)}
                        </span>
                        {post.templateType && (
                          <span className="text-sm text-gray-500">
                            [{post.templateType}]
                          </span>
                        )}
                        {post.aiGenerated && (
                          <span className="text-sm text-blue-600">
                            🤖 AI生成
                          </span>
                        )}
                      </div>

                      <p className="text-gray-800 whitespace-pre-wrap mb-3">
                        {post.editedContent || post.content}
                      </p>

                      {post.refPost && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          <p className="text-gray-600 mb-1">参照: @{post.refPost.authorUsername}</p>
                          <p className="text-gray-700">{post.refPost.content}</p>
                        </div>
                      )}

                      <div className="mt-3 text-sm text-gray-500">
                        投稿予定: {formatDate(post.scheduledTime)}
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      {post.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => updatePostStatus(post.id, 'SCHEDULED')}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            予約する
                          </button>
                          <button
                            onClick={() => window.location.href = `/create?editId=${post.id}`}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                          >
                            編集
                          </button>
                        </>
                      )}
                      {post.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => postNow(post.id)}
                            disabled={posting === post.id}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:bg-gray-400"
                          >
                            {posting === post.id ? '投稿中...' : '今すぐ投稿'}
                          </button>
                          <button
                            onClick={() => updatePostStatus(post.id, 'DRAFT')}
                            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                          >
                            下書きに戻す
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deletePost(post.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}