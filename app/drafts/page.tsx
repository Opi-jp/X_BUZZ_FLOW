'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Send, Edit2, Trash2, Calendar, Loader2 } from 'lucide-react'

interface Draft {
  id: string
  sessionId: string
  content: string
  format: string
  status: string
  metadata: any
  tweetId?: string
  createdAt: string
  updatedAt: string
}

export default function DraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState('')

  // 下書き一覧を取得
  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/drafts')
      if (!response.ok) throw new Error('Failed to fetch drafts')
      
      const data = await response.json()
      setDrafts(data.drafts)
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  // 投稿実行
  const handlePost = async (draft: Draft) => {
    setPosting(draft.id)
    
    try {
      const content = editingDraft === draft.id ? editedContent : draft.content
      const hashtags = draft.metadata?.hashtags || ['AI時代', 'X_BUZZ_FLOW']
      const text = `${content}\n\n${hashtags.map((tag: string) => `#${tag.replace(/^#/, '')}`).join(' ')}`
      
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, draftId: draft.id })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`投稿成功！\nURL: ${result.url}`)
        // 一覧を更新
        fetchDrafts()
      } else {
        throw new Error(result.error || '投稿失敗')
      }
    } catch (error) {
      alert(`投稿エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPosting(null)
    }
  }

  // 下書き削除
  const handleDelete = async (id: string) => {
    if (!confirm('この下書きを削除しますか？')) return
    
    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== id))
      }
    } catch (error) {
      alert('削除エラーが発生しました')
    }
  }

  // 編集開始/保存
  const handleEdit = async (draft: Draft) => {
    if (editingDraft === draft.id) {
      // 保存
      try {
        const response = await fetch(`/api/drafts/${draft.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editedContent })
        })
        
        if (response.ok) {
          setDrafts(drafts.map(d => 
            d.id === draft.id ? { ...d, content: editedContent } : d
          ))
          setEditingDraft(null)
          setEditedContent('')
        }
      } catch (error) {
        alert('保存エラーが発生しました')
      }
    } else {
      // 編集開始
      setEditingDraft(draft.id)
      setEditedContent(draft.content)
    }
  }

  // ステータスのバッジ色
  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      posted: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700'
    }
    return badges[status as keyof typeof badges] || badges.draft
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">下書き管理</h1>
                <p className="text-gray-600">{drafts.length}件の下書き</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/create')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              新規作成
            </button>
          </div>
        </div>

        {/* 下書き一覧 */}
        {drafts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">まだ下書きがありません</p>
            <button
              onClick={() => router.push('/create')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              最初の投稿を作成
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const isEditing = editingDraft === draft.id
              const isPosting = posting === draft.id
              
              return (
                <div key={draft.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(draft.status)}`}>
                        {draft.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(draft.createdAt).toLocaleDateString('ja-JP')}
                      </span>
                      {draft.metadata?.conceptTitle && (
                        <span className="text-sm text-gray-600">
                          {draft.metadata.conceptTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(draft)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        disabled={isPosting}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        disabled={isPosting || isEditing}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* コンテンツ */}
                  {isEditing ? (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                      rows={4}
                    />
                  ) : (
                    <p className="text-gray-800 whitespace-pre-wrap mb-4">
                      {draft.content}
                    </p>
                  )}

                  {/* アクション */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {draft.content.length}文字
                    </div>
                    <div className="flex gap-2">
                      {isEditing && (
                        <>
                          <button
                            onClick={() => {
                              setEditingDraft(null)
                              setEditedContent('')
                            }}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => handleEdit(draft)}
                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            保存
                          </button>
                        </>
                      )}
                      {!isEditing && draft.status !== 'posted' && (
                        <>
                          <button
                            className="px-3 py-1 text-purple-600 border border-purple-600 rounded hover:bg-purple-50 flex items-center gap-1"
                            disabled={isPosting}
                          >
                            <Calendar className="w-4 h-4" />
                            スケジュール
                          </button>
                          <button
                            onClick={() => handlePost(draft)}
                            disabled={isPosting}
                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                          >
                            {isPosting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                投稿中...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                今すぐ投稿
                              </>
                            )}
                          </button>
                        </>
                      )}
                      {draft.status === 'posted' && draft.tweetId && (
                        <a
                          href={`https://twitter.com/user/status/${draft.tweetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-blue-600 hover:text-blue-700"
                        >
                          投稿を見る →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}