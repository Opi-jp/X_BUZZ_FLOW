'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

interface NewsThreadItem {
  id: string
  content: string
  position: number
  articleId?: string
  metadata?: any
  article?: {
    title: string
    url: string
    summary?: string
    analysis?: {
      japaneseSummary: string
      keyPoints: string[]
    }
  }
}

interface NewsThread {
  id: string
  title: string
  status: string
  scheduledAt?: string
  createdAt: string
  items: NewsThreadItem[]
  metadata?: any
}

const COMMENT_SNIPPETS = [
  { label: 'これは注目', text: '【これは注目】' },
  { label: '個人的には', text: '個人的には、' },
  { label: '重要なポイント', text: '重要なポイントは、' },
  { label: '今後の展開', text: '今後の展開に注目です。' },
  { label: '日本でも', text: '日本でも' },
  { label: '業界への影響', text: '業界への影響が大きそうです。' },
]

export default function EditThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [thread, setThread] = useState<NewsThread | null>(null)
  const [editedItems, setEditedItems] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [showSnippets, setShowSnippets] = useState<string | null>(null)
  const [isDraft, setIsDraft] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const resolvedParams = await params
      await fetchThread(resolvedParams.id)
    }
    fetchData()
  }, [params])

  const fetchThread = async (threadId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/news/threads/${threadId}`)
      if (res.ok) {
        const data = await res.json()
        setThread(data)
        // 初期値を設定
        const initial: { [key: string]: string } = {}
        data.items.forEach((item: NewsThreadItem) => {
          initial[item.id] = item.content
        })
        setEditedItems(initial)
      } else {
        alert('スレッドの取得に失敗しました')
        router.push('/news/threads')
      }
    } catch (error) {
      console.error('Error fetching thread:', error)
      alert('スレッドの取得に失敗しました')
      router.push('/news/threads')
    } finally {
      setLoading(false)
    }
  }

  const handleContentChange = (itemId: string, content: string) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: content
    }))
  }

  const getCharCount = (text: string) => {
    return text.length
  }

  const isOverLimit = (text: string) => {
    return text.length > 140
  }

  const handleSave = async (asDraft = false) => {
    setSaving(true)
    try {
      // 編集内容を保存
      const updates = thread?.items.map(item => ({
        id: item.id,
        content: editedItems[item.id] || item.content
      }))

      const resolvedParams = await params
      const res = await fetch(`/api/news/threads/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: updates,
          status: asDraft ? 'draft' : thread?.status 
        }),
      })

      if (res.ok) {
        alert(asDraft ? '下書きとして保存しました' : '保存しました')
        fetchThread(resolvedParams.id)
      } else {
        alert('保存に失敗しました')
      }
    } catch (error) {
      console.error('Error saving thread:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handlePost = async () => {
    // 文字数制限チェック
    const hasOverLimit = thread?.items.some(item => 
      isOverLimit(editedItems[item.id] || item.content)
    )
    
    if (hasOverLimit) {
      alert('140文字を超えているツイートがあります。修正してください。')
      return
    }

    if (!confirm('このスレッドをTwitterに投稿しますか？')) return

    // まず保存
    await handleSave()

    setPosting(true)
    try {
      const res = await fetch('/api/news/post-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: (await params).id }),
      })

      const data = await res.json()
      
      if (res.ok) {
        alert('スレッドを投稿しました')
        if (data.threadUrl) {
          window.open(data.threadUrl, '_blank')
        }
        router.push('/news/threads')
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

  if (loading || !thread) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div>読み込み中...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">スレッド編集</h1>
            <p className="mt-1 text-sm text-gray-600">
              {thread.title}
            </p>
          </div>

          {/* 操作ボタン */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => router.push('/news/threads')}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
            >
              {saving ? '保存中...' : '下書き保存'}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handlePost}
              disabled={posting || saving}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {posting ? '投稿中...' : 'Twitterに投稿'}
            </button>
          </div>

          {/* ツイート編集エリア */}
          <div className="space-y-4">
            {thread.items.map((item, index) => {
              const content = editedItems[item.id] || item.content
              const charCount = getCharCount(content)
              const overLimit = isOverLimit(content)
              
              return (
                <div key={item.id} className="bg-white rounded-lg shadow p-6">
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        {index === 0 ? 'メインツイート' : `${index}. ${item.article?.title || 'ニュース'}`}
                      </span>
                      {item.article && (
                        <a
                          href={item.article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          元記事を見る
                        </a>
                      )}
                    </div>
                    
                    {/* 元の分析結果を表示（メインツイート以外） */}
                    {index > 0 && item.article?.analysis && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="mb-2">
                          <span className="font-medium text-gray-700">要約:</span>
                          <p className="text-gray-600 mt-1">{item.article.analysis.japaneseSummary}</p>
                        </div>
                        {item.article.analysis.keyPoints.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">キーポイント:</span>
                            <ul className="mt-1 list-disc list-inside text-gray-600">
                              {item.article.analysis.keyPoints.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* コメントスニペット */}
                  {index > 0 && (
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={() => setShowSnippets(showSnippets === item.id ? null : item.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        コメントを挿入 ▼
                      </button>
                      {showSnippets === item.id && (
                        <div className="mt-2 p-2 bg-gray-100 rounded flex flex-wrap gap-2">
                          {COMMENT_SNIPPETS.map((snippet, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const currentContent = editedItems[item.id] || item.content
                                handleContentChange(item.id, currentContent + ' ' + snippet.text)
                                setShowSnippets(null)
                              }}
                              className="px-3 py-1 bg-white rounded text-sm hover:bg-blue-50"
                            >
                              {snippet.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <textarea
                    value={content}
                    onChange={(e) => handleContentChange(item.id, e.target.value)}
                    className={`w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 ${
                      overLimit 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    rows={4}
                  />
                  
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-sm ${
                      overLimit ? 'text-red-600 font-semibold' : 'text-gray-500'
                    }`}>
                      {charCount} / 140文字
                    </span>
                    {overLimit && (
                      <span className="text-sm text-red-600">
                        ※ 文字数制限を超えています
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* プレビューセクション */}
          <div className="mt-8 mb-16">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">プレビュー</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              {thread.items.map((item, index) => {
                const content = editedItems[item.id] || item.content
                return (
                  <div key={item.id} className="bg-white rounded p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
                            if (part.match(/^https?:\/\//)) {
                              return (
                                <a
                                  key={i}
                                  href={part}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 underline"
                                >
                                  {part}
                                </a>
                              )
                            }
                            return part
                          })}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-gray-400 text-sm">
                          <span>いいね</span>
                          <span>リツイート</span>
                          <span>返信</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}