'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

interface AIPattern {
  id: string
  name: string
  description: string
}

interface BuzzPost {
  id: string
  content: string
  authorUsername: string
  likesCount: number
  retweetsCount: number
}

function CreatePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const refPostId = searchParams.get('refPostId')

  const [content, setContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [postType, setPostType] = useState<'NEW' | 'RETWEET' | 'QUOTE'>('NEW')
  const [templateType, setTemplateType] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [patterns, setPatterns] = useState<AIPattern[]>([])
  const [selectedPatternId, setSelectedPatternId] = useState('')
  const [refPost, setRefPost] = useState<BuzzPost | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPatterns()
    if (refPostId) {
      fetchRefPost()
    }
  }, [refPostId])

  const fetchPatterns = async () => {
    try {
      const res = await fetch('/api/ai-patterns')
      const data = await res.json()
      setPatterns(data)
    } catch (error) {
      console.error('Error fetching patterns:', error)
    }
  }

  const fetchRefPost = async () => {
    try {
      const res = await fetch(`/api/buzz-posts/${refPostId}`)
      const data = await res.json()
      setRefPost(data)
    } catch (error) {
      console.error('Error fetching reference post:', error)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const body: any = {}
      
      if (refPostId) body.refPostId = refPostId
      if (selectedPatternId) body.patternId = selectedPatternId
      if (!refPostId && !selectedPatternId) {
        body.customPrompt = 'バズりそうな投稿を1つ生成してください。140文字以内で。'
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      setContent(data.generatedContent)
      setEditedContent(data.generatedContent)
    } catch (error) {
      console.error('Error generating content:', error)
      alert('生成中にエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!editedContent.trim()) {
      alert('投稿内容を入力してください')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/scheduled-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content || editedContent,
          editedContent: editedContent !== content ? editedContent : undefined,
          scheduledTime: scheduledTime || new Date(Date.now() + 3600000).toISOString(),
          postType,
          refPostId,
          templateType: templateType || undefined,
          aiGenerated: !!content,
          aiPrompt: selectedPatternId ? `Pattern: ${patterns.find(p => p.id === selectedPatternId)?.name}` : undefined,
        }),
      })

      if (res.ok) {
        router.push('/schedule')
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      alert('保存中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  // URLを除外して文字数をカウント（日本語なので140文字制限）
  const characterCount = editedContent.replace(/https?:\/\/[^\s]+/g, '').length
  const isOverLimit = characterCount > 140

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">投稿作成</h1>
            <p className="mt-1 text-sm text-gray-600">
              AIを使って事実に基づいた投稿を生成・編集できます
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 左側：生成設定 */}
            <div className="space-y-4">
              {/* 参照投稿 */}
              {refPost && (
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">参照投稿</h3>
                  <div className="text-sm">
                    <p className="text-gray-600">@{refPost.authorUsername}</p>
                    <p className="mt-1">{refPost.content}</p>
                    <div className="mt-2 flex gap-4 text-gray-500">
                      <span>❤️ {refPost.likesCount.toLocaleString()}</span>
                      <span>🔄 {refPost.retweetsCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AIパターン選択 */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-3">AIパターン</h3>
                <select
                  value={selectedPatternId}
                  onChange={(e) => setSelectedPatternId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">パターンを選択</option>
                  {patterns.map((pattern) => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.name}
                    </option>
                  ))}
                </select>
                {selectedPatternId && (
                  <p className="mt-2 text-sm text-gray-600">
                    {patterns.find(p => p.id === selectedPatternId)?.description}
                  </p>
                )}
              </div>

              {/* 生成ボタン */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {generating ? 'AI生成中...' : 'AIで生成'}
              </button>

              {/* AI生成結果 */}
              {content && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">AI生成結果</h3>
                  <p className="text-sm whitespace-pre-wrap">{content}</p>
                </div>
              )}
            </div>

            {/* 中央と右側：編集・設定 */}
            <div className="xl:col-span-2 space-y-4">
              {/* 投稿内容編集 - 大きく表示 */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">投稿内容</h3>
                  <div className={`text-sm font-medium ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                    {characterCount} / 140
                  </div>
                </div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="投稿内容を入力してください。&#10;&#10;AIが生成した内容をベースに、あなたの経験や知見を加えて編集しましょう。"
                  rows={10}
                  className={`w-full px-4 py-3 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    isOverLimit ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  style={{ fontSize: '16px', lineHeight: '1.6' }}
                />
                {isOverLimit && (
                  <p className="mt-2 text-sm text-red-600">
                    文字数制限を超えています。内容を短くしてください。
                  </p>
                )}
                
                {/* クイックアクション */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditedContent(editedContent + '\n\n#AI活用')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    #AI活用
                  </button>
                  <button
                    onClick={() => setEditedContent(editedContent + '\n\n#働き方改革')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    #働き方改革
                  </button>
                  <button
                    onClick={() => setEditedContent(editedContent + '\n\n#クリエイティブ')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    #クリエイティブ
                  </button>
                  <button
                    onClick={() => setEditedContent('')}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    クリア
                  </button>
                </div>
              </div>

              {/* 投稿設定とアクション */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 投稿設定 */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">投稿設定</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        投稿タイプ
                      </label>
                      <select
                        value={postType}
                        onChange={(e) => setPostType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="NEW">新規投稿</option>
                        <option value="RETWEET">リツイート</option>
                        <option value="QUOTE">引用リツイート</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        投稿予定時刻
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        未設定の場合は1時間後に設定されます
                      </p>
                    </div>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">アクション</h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleSave}
                      disabled={saving || !editedContent.trim() || isOverLimit}
                      className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                    >
                      {saving ? '保存中...' : '予定投稿として保存'}
                    </button>
                    
                    <button
                      onClick={() => router.push('/schedule')}
                      className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      スケジュール画面へ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center h-full">
            <div>Loading...</div>
          </div>
        </main>
      </div>
    }>
      <CreatePageContent />
    </Suspense>
  )
}