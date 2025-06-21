'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Calendar, Send, Trash2, Edit, Eye, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Draft {
  id: string
  sessionId: string
  conceptId: string
  characterId: string
  content: string
  format: 'single' | 'thread'
  posts?: Array<{
    content: string
    order: number
  }>
  metadata: {
    conceptTitle: string
    tone: string
    callToAction: string
    engagementHooks: string[]
  }
  status: 'draft' | 'scheduled' | 'published'
  scheduledAt?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/create/draft/list')
      if (!response.ok) throw new Error('Failed to fetch drafts')
      const data = await response.json()
      setDrafts(data.drafts)
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (draft: Draft) => {
    setEditingId(draft.id)
    setEditContent(draft.format === 'thread' 
      ? draft.posts?.map(p => p.content).join('\n\n---\n\n') || ''
      : draft.content
    )
  }

  const handleSaveEdit = async () => {
    if (!editingId) return

    try {
      const response = await fetch(`/api/create/draft/list/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })

      if (response.ok) {
        await fetchDrafts()
        setEditingId(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Error updating draft:', error)
    }
  }

  const handleDelete = async (draftId: string) => {
    if (!confirm('この下書きを削除しますか？')) return

    try {
      const response = await fetch(`/api/create/draft/list/${draftId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchDrafts()
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
    }
  }

  const handleSchedule = (draftId: string) => {
    router.push(`/generation/schedule?draftId=${draftId}`)
  }

  const handlePublishNow = async (draftId: string) => {
    if (!confirm('今すぐ投稿しますか？')) return

    try {
      const response = await fetch('/api/publish/post/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })

      if (response.ok) {
        alert('投稿しました！')
        await fetchDrafts()
      } else {
        throw new Error('投稿に失敗しました')
      }
    } catch (error) {
      alert('投稿エラー: ' + (error instanceof Error ? error.message : 'エラー'))
    }
  }

  const handleBulkSchedule = () => {
    if (selectedDrafts.length === 0) return
    router.push(`/generation/schedule?draftIds=${selectedDrafts.join(',')}`)
  }

  const toggleSelection = (draftId: string) => {
    setSelectedDrafts(prev => 
      prev.includes(draftId) 
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    )
  }

  const filteredDrafts = drafts.filter(draft => 
    filter === 'all' || draft.status === filter
  )

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
              <h1 className="text-2xl font-bold text-gray-900">下書き管理</h1>
              <p className="mt-1 text-gray-600">
                生成された投稿の編集・スケジュール設定
              </p>
            </div>
            <div className="flex gap-3">
              {selectedDrafts.length > 0 && (
                <button
                  onClick={handleBulkSchedule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  一括スケジュール ({selectedDrafts.length})
                </button>
              )}
              <button
                onClick={() => router.push('/generation/content')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                新規作成
              </button>
            </div>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">表示:</span>
            <div className="flex gap-2">
              {(['all', 'draft', 'scheduled', 'published'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' && 'すべて'}
                  {status === 'draft' && '下書き'}
                  {status === 'scheduled' && 'スケジュール済み'}
                  {status === 'published' && '投稿済み'}
                </button>
              ))}
            </div>
            <div className="ml-auto text-sm text-gray-600">
              {filteredDrafts.length}件表示中
            </div>
          </div>
        </div>

        {/* 下書きリスト */}
        <div className="space-y-4">
          {filteredDrafts.map(draft => (
            <div key={draft.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                {editingId === draft.id ? (
                  /* 編集モード */
                  <div className="space-y-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-40 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="投稿内容を編集..."
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 通常表示 */
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDrafts.includes(draft.id)}
                          onChange={() => toggleSelection(draft.id)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {draft.metadata.conceptTitle}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              draft.format === 'thread' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {draft.format === 'thread' ? 'スレッド' : '単独'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              draft.status === 'draft' && 'bg-gray-100 text-gray-700'
                            }${
                              draft.status === 'scheduled' && 'bg-yellow-100 text-yellow-700'
                            }${
                              draft.status === 'published' && 'bg-green-100 text-green-700'
                            }`}>
                              {draft.status === 'draft' && '下書き'}
                              {draft.status === 'scheduled' && 'スケジュール済み'}
                              {draft.status === 'published' && '投稿済み'}
                            </span>
                            <span className="text-gray-500">
                              {formatDistanceToNow(new Date(draft.createdAt), { 
                                addSuffix: true, 
                                locale: ja 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {draft.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEdit(draft)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="編集"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSchedule(draft.id)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="スケジュール"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePublishNow(draft.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="今すぐ投稿"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(draft.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* コンテンツプレビュー */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap line-clamp-3">
                        {draft.format === 'thread' 
                          ? draft.posts?.[0]?.content || draft.content
                          : draft.content
                        }
                      </p>
                      {draft.format === 'thread' && draft.posts && draft.posts.length > 1 && (
                        <p className="text-sm text-gray-500 mt-2">
                          +{draft.posts.length - 1}件のツイート
                        </p>
                      )}
                    </div>

                    {/* スケジュール情報 */}
                    {draft.scheduledAt && (
                      <div className="mt-3 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        投稿予定: {new Date(draft.scheduledAt).toLocaleString('ja-JP')}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredDrafts.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">下書きがありません</p>
          </div>
        )}
      </div>
    </div>
  )
}