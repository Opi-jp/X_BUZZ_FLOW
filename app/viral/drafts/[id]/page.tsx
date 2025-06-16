'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DraftScheduler from '@/app/components/scheduler/DraftScheduler'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  explanation: string
  targetAudience: string
  createdAt: string
  updatedAt: string
}

export default function EditDraftPage() {
  const params = useParams()
  const router = useRouter()
  const draftId = params.id as string

  const [draft, setDraft] = useState<Draft | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [newHashtag, setNewHashtag] = useState('')
  const [editorNotes, setEditorNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('edit')

  useEffect(() => {
    if (draftId) {
      fetchDraft()
    }
  }, [draftId])

  const fetchDraft = async () => {
    try {
      const response = await fetch(`/api/viral/drafts/${draftId}`)
      if (!response.ok) {
        throw new Error('下書きの取得に失敗しました')
      }
      const data = await response.json()
      setDraft(data.draft)
      setEditedContent(data.draft.editedContent || data.draft.content)
      setHashtags(data.draft.hashtags || [])
      setEditorNotes(data.draft.editorNotes || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!draft) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/viral/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editedContent,
          hashtags,
          editorNotes,
          status: 'reviewed'
        })
      })

      if (!response.ok) {
        throw new Error('保存に失敗しました')
      }

      const data = await response.json()
      setDraft(data.draft)
      alert('保存しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この下書きを削除しますか？')) return

    try {
      const response = await fetch(`/api/viral/drafts/${draftId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      alert('削除しました')
      router.push('/viral/drafts')
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除中にエラーが発生しました')
    }
  }

  const handleSchedule = async (scheduleData: any) => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/viral/drafts/${draftId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      })

      if (!response.ok) {
        throw new Error('スケジュール設定に失敗しました')
      }

      alert('スケジュールを設定しました')
      router.push('/viral/drafts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スケジュール設定中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(`#${newHashtag.replace('#', '')}`)) {
      setHashtags([...hashtags, `#${newHashtag.replace('#', '')}`])
      setNewHashtag('')
    }
  }

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag))
  }

  // URL除外文字数カウント（X Premium対応）
  const getCharacterCount = (text: string): number => {
    const urlRegex = /https?:\/\/[^\s]+/g
    const textWithoutUrls = text.replace(urlRegex, '')
    return [...textWithoutUrls].length // Unicode対応
  }
  
  const charCount = getCharacterCount(editedContent)
  const isOverLimit = charCount > 4000 // X Premium制限

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">読み込み中...</div>
      </div>
    )
  }

  if (error || !draft) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-600">{error || '下書きが見つかりません'}</p>
          <Link href="/viral/drafts" className="text-blue-500 underline mt-2 inline-block">
            一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">下書き編集</h1>
          <p className="text-sm text-gray-600 mt-1">
            コンテンツ編集とスケジュール設定
          </p>
        </div>
        <Link href="/viral/drafts" className="text-blue-500 hover:underline">
          ← 一覧に戻る
        </Link>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* タブ形式UI */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit">📝 編集</TabsTrigger>
          <TabsTrigger value="schedule">📅 スケジュール</TabsTrigger>
        </TabsList>

        {/* 編集タブ */}
        <TabsContent value="edit" className="space-y-6">
          {/* メタ情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">カテゴリ:</span>
            <span className="ml-2 font-medium">{draft.category}</span>
          </div>
          <div>
            <span className="text-gray-600">ターゲット:</span>
            <span className="ml-2 font-medium">{draft.targetAudience}</span>
          </div>
          <div>
            <span className="text-gray-600">タイプ:</span>
            <span className="ml-2 font-medium">{draft.conceptType}</span>
          </div>
          <div>
            <span className="text-gray-600">ステータス:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              draft.status === 'posted' ? 'bg-green-100 text-green-800' :
              draft.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {draft.status}
            </span>
          </div>
        </div>
      </div>

      {/* タイトルと説明 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{draft.title}</h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">{draft.explanation}</p>
        </div>
      </div>

      {/* コンテンツ編集 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          投稿内容
        </label>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            isOverLimit ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={4}
          placeholder="投稿内容を編集..."
        />
        <div className="flex justify-between mt-1">
          <div className="text-sm text-gray-500">
            {draft.content !== editedContent && (
              <button
                onClick={() => setEditedContent(draft.content)}
                className="text-blue-500 hover:underline"
              >
                元に戻す
              </button>
            )}
          </div>
          <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
            {charCount} / 4,000 {charCount > 0 && '（URL除外）'}
          </div>
        </div>
      </div>

      {/* ハッシュタグ */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ハッシュタグ
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {hashtags.map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
            >
              {tag}
              <button
                onClick={() => removeHashtag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
            placeholder="新しいハッシュタグ"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addHashtag}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            追加
          </button>
        </div>
      </div>

      {/* エディターノート */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          メモ（非公開）
        </label>
        <textarea
          value={editorNotes}
          onChange={(e) => setEditorNotes(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="編集メモ..."
        />
      </div>

      {/* アクションボタン */}
      <div className="flex justify-between pt-6 border-t">
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          disabled={draft.status === 'posted'}
        >
          削除
        </button>
        <div className="flex gap-3">
          <Link
            href="/viral/drafts"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || isOverLimit}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

        {/* スケジュール タブ */}
        <TabsContent value="schedule" className="space-y-6">
          <DraftScheduler
            draftId={draftId}
            contentType={draft.conceptType}
            onSchedule={handleSchedule}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}