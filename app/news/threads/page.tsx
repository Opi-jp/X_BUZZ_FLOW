'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { useRouter } from 'next/navigation'

interface NewsThreadItem {
  id: string
  content: string
  position: number
  articleId?: string
  metadata?: any
  article?: {
    title: string
    url: string
  }
}

interface NewsThread {
  id: string
  title: string
  status: string
  scheduledAt?: string
  createdAt: string
  items: NewsThreadItem[]
  _count: {
    items: number
  }
}

export default function ThreadsPage() {
  const [threads, setThreads] = useState<NewsThread[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedThread, setSelectedThread] = useState<NewsThread | null>(null)
  const [posting, setPosting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchThreads()
  }, [])

  const fetchThreads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/news/generate-thread')
      const data = await res.json()
      setThreads(data)
    } catch (error) {
      console.error('Error fetching threads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (threadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/news/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        fetchThreads()
      }
    } catch (error) {
      console.error('Error updating thread status:', error)
    }
  }

  const handlePostThread = async (thread: NewsThread) => {
    if (!confirm('このスレッドをTwitterに投稿しますか？')) return

    setPosting(true)
    try {
      const res = await fetch('/api/news/post-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id }),
      })

      const data = await res.json()
      
      if (res.ok) {
        alert('スレッドを投稿しました')
        fetchThreads()
      } else {
        alert(data.error || 'スレッド投稿中にエラーが発生しました')
      }
    } catch (error) {
      console.error('Error posting thread:', error)
      alert('スレッド投稿中にエラーが発生しました')
    } finally {
      setPosting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'posted': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '下書き'
      case 'scheduled': return '予約済み'
      case 'posted': return '投稿済み'
      case 'failed': return '失敗'
      default: return status
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">AIニューススレッド管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              生成されたニューススレッドの管理と投稿
            </p>
          </div>

          {/* スレッド一覧 */}
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : threads.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">スレッドがありません</p>
              <button
                onClick={() => router.push('/news')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                ニュース管理へ
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {threads.map((thread) => (
                <div key={thread.id} className="bg-white rounded-lg shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {thread.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{formatDate(thread.createdAt)}</span>
                          <span>{thread._count.items}個のツイート</span>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(thread.status)}`}>
                            {getStatusText(thread.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedThread(thread)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                        >
                          詳細
                        </button>
                        {thread.status === 'draft' && (
                          <button
                            onClick={() => handlePostThread(thread)}
                            disabled={posting}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:bg-gray-400"
                          >
                            {posting ? '投稿中...' : '投稿'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* メインツイートのプレビュー */}
                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-700">
                        {thread.items[0]?.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* スレッド詳細モーダル */}
          {selectedThread && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedThread.title}
                    </h2>
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="space-y-4">
                    {selectedThread.items.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-500">
                            {index === 0 ? 'メインツイート' : `${index}. ${item.article?.title || 'ニュース'}`}
                          </span>
                          {item.article && (
                            <a
                              href={item.article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              元記事
                            </a>
                          )}
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {item.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          文字数: {item.content.length}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      閉じる
                    </button>
                    {selectedThread.status === 'draft' && (
                      <button
                        onClick={() => {
                          handlePostThread(selectedThread)
                          setSelectedThread(null)
                        }}
                        disabled={posting}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {posting ? '投稿中...' : 'Twitterに投稿'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}