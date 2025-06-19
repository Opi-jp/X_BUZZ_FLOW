'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Send, Pause, Play } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ScheduledPost {
  id: string
  draftId: string
  scheduledAt: string
  status: 'pending' | 'publishing' | 'published' | 'failed'
  error?: string
  publishedAt?: string
  metadata: {
    conceptTitle: string
    format: string
  }
}

interface PublisherStatus {
  isRunning: boolean
  lastCheck: string
  nextCheck: string
  queueSize: number
}

export default function PublisherPage() {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [publisherStatus, setPublisherStatus] = useState<PublisherStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000) // 5秒ごとに更新
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchData = async () => {
    try {
      // スケジュールされた投稿を取得
      const postsRes = await fetch('/api/automation/scheduled-posts')
      const postsData = await postsRes.json()
      setScheduledPosts(postsData.posts || [])

      // パブリッシャーステータスを取得
      const statusRes = await fetch('/api/automation/publisher/status')
      const statusData = await statusRes.json()
      setPublisherStatus(statusData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePublishNow = async (postId: string) => {
    if (!confirm('今すぐ投稿しますか？')) return

    try {
      const response = await fetch(`/api/automation/scheduled-posts/${postId}/publish-now`, {
        method: 'POST'
      })

      if (response.ok) {
        alert('投稿しました！')
        fetchData()
      } else {
        throw new Error('投稿に失敗しました')
      }
    } catch (error) {
      alert('エラー: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCancelSchedule = async (postId: string) => {
    if (!confirm('スケジュールをキャンセルしますか？')) return

    try {
      const response = await fetch(`/api/automation/scheduled-posts/${postId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      alert('エラー: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleTogglePublisher = async () => {
    try {
      const action = publisherStatus?.isRunning ? 'stop' : 'start'
      const response = await fetch(`/api/automation/publisher/${action}`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      alert('エラー: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'publishing': return 'text-blue-600 bg-blue-50'
      case 'published': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'publishing': return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'published': return <CheckCircle className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">投稿パブリッシャー</h1>
              <p className="mt-1 text-gray-600">
                スケジュールされた投稿の自動実行管理
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">自動更新</span>
              </label>
              <button
                onClick={fetchData}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* パブリッシャーステータス */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">パブリッシャーステータス</h2>
              {publisherStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">状態:</span>
                    <span className={`ml-2 font-medium ${
                      publisherStatus.isRunning ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {publisherStatus.isRunning ? '稼働中' : '停止中'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">キュー:</span>
                    <span className="ml-2 font-medium">{publisherStatus.queueSize}件</span>
                  </div>
                  <div>
                    <span className="text-gray-600">最終チェック:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(publisherStatus.lastCheck), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">次回チェック:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(publisherStatus.nextCheck), 'HH:mm:ss')}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleTogglePublisher}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                publisherStatus?.isRunning
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {publisherStatus?.isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  停止
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  開始
                </>
              )}
            </button>
          </div>
        </div>

        {/* スケジュールされた投稿 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">スケジュール済み投稿</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {scheduledPosts.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">スケジュールされた投稿はありません</p>
              </div>
            ) : (
              scheduledPosts.map(post => (
                <div key={post.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {post.metadata.conceptTitle}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(post.status)}`}>
                          {getStatusIcon(post.status)}
                          {post.status === 'pending' && '待機中'}
                          {post.status === 'publishing' && '投稿中'}
                          {post.status === 'published' && '投稿済み'}
                          {post.status === 'failed' && '失敗'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {post.metadata.format === 'thread' ? 'スレッド' : '単独投稿'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            予定: {format(new Date(post.scheduledAt), 'M月d日 HH:mm', { locale: ja })}
                          </span>
                        </div>
                        {post.publishedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>
                              投稿済み: {format(new Date(post.publishedAt), 'HH:mm')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {post.error && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          エラー: {post.error}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {post.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handlePublishNow(post.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="今すぐ投稿"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCancelSchedule(post.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="キャンセル"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待機中</p>
                <p className="text-2xl font-semibold text-yellow-600">
                  {scheduledPosts.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">投稿済み</p>
                <p className="text-2xl font-semibold text-green-600">
                  {scheduledPosts.filter(p => p.status === 'published').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">失敗</p>
                <p className="text-2xl font-semibold text-red-600">
                  {scheduledPosts.filter(p => p.status === 'failed').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}