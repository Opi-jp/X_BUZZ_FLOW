'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

interface Draft {
  id: string
  conceptType: string
  category: string
  title: string
  content: string
  editedContent?: string
  status: string
  hashtags: string[]
  metadata: any
  createdAt: string
  updatedAt: string
}

export default function DraftsPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')

  useEffect(() => {
    fetchDrafts()
  }, [sessionId])

  const fetchDrafts = async () => {
    try {
      const url = sessionId 
        ? `/api/viral/drafts?sessionId=${sessionId}`
        : '/api/viral/drafts'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.drafts || [])
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDraft = async (draftId: string, content: string) => {
    try {
      const response = await fetch(`/api/viral/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedContent: content })
      })

      if (response.ok) {
        fetchDrafts()
        setEditMode(false)
        setSelectedDraft(null)
      }
    } catch (error) {
      console.error('Failed to update draft:', error)
    }
  }

  const formatDate = (date: string) => {
    return formatInTimeZone(new Date(date), 'Asia/Tokyo', 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'controversy': return 'bg-red-100 text-red-800'
      case 'empathy': return 'bg-purple-100 text-purple-800'
      case 'humor': return 'bg-yellow-100 text-yellow-800'
      case 'insight': return 'bg-blue-100 text-blue-800'
      case 'news': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'edited': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-yellow-100 text-yellow-800'
      case 'posted': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            コンテンツ下書き管理
          </h1>
          <p className="text-gray-600">
            生成されたコンテンツの編集・管理
          </p>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">すべて</option>
                <option value="draft">下書き</option>
                <option value="edited">編集済み</option>
                <option value="approved">承認済み</option>
                <option value="scheduled">予約済み</option>
                <option value="posted">投稿済み</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ
              </label>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">すべて</option>
                <option value="AI依存">AI依存</option>
                <option value="働き方改革">働き方改革</option>
                <option value="世代間ギャップ">世代間ギャップ</option>
                <option value="未来予測">未来予測</option>
              </select>
            </div>
          </div>
        </div>

        {/* 下書き一覧 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：一覧 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4">下書き一覧</h2>
            
            {drafts.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-gray-500">
                <p>下書きがありません</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => {
                    setSelectedDraft(draft)
                    setEditedContent(draft.editedContent || draft.content)
                    setEditMode(false)
                  }}
                  className={`bg-white rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedDraft?.id === draft.id 
                      ? 'ring-2 ring-blue-500 shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{draft.title}</h3>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(draft.conceptType)}`}>
                        {draft.conceptType}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(draft.status)}`}>
                        {draft.status}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {draft.editedContent || draft.content}
                  </p>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{draft.category}</span>
                    <span>{formatDate(draft.updatedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 右側：詳細・編集 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-4">
            {selectedDraft ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold">コンテンツ詳細</h2>
                  <div className="flex gap-2">
                    {!editMode ? (
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        編集
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => updateDraft(selectedDraft.id, editedContent)}
                          className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditMode(false)
                            setEditedContent(selectedDraft.editedContent || selectedDraft.content)
                          }}
                          className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          キャンセル
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* メタ情報 */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">タイプ:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getTypeColor(selectedDraft.conceptType)}`}>
                        {selectedDraft.conceptType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">カテゴリ:</span>
                      <span className="ml-2 font-medium">{selectedDraft.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">プラットフォーム:</span>
                      <span className="ml-2 font-medium">{selectedDraft.metadata?.platform || 'Twitter'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">形式:</span>
                      <span className="ml-2 font-medium">{selectedDraft.metadata?.format || 'single'}</span>
                    </div>
                  </div>

                  {/* コンテンツ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      コンテンツ
                    </label>
                    {editMode ? (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <pre className="whitespace-pre-wrap text-sm font-sans">
                          {selectedDraft.editedContent || selectedDraft.content}
                        </pre>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      文字数: {(selectedDraft.editedContent || selectedDraft.content).length}
                    </p>
                  </div>

                  {/* ハッシュタグ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ハッシュタグ
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedDraft.hashtags.map((tag, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* アクション */}
                  <div className="flex gap-2 pt-4 border-t">
                    <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                      スケジュール設定
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(selectedDraft.editedContent || selectedDraft.content)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      コピー
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>下書きを選択してください</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}