'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Twitter, Send, Loader2, AlertCircle, Check, RefreshCw } from 'lucide-react'

interface Draft {
  id: string
  title: string
  content: string
  hashtags: string[]
  characterId: string
  status: string
  createdAt: string
  sessionId: string
}

export default function PostPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState<string | null>(null)
  const [posted, setPosted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/generation/drafts')
      if (!response.ok) throw new Error('下書きの取得に失敗しました')
      
      const data = await response.json()
      // 最新のDRAFT状態のものだけ表示
      const draftList = data.drafts?.filter((d: Draft) => d.status === 'DRAFT') || []
      setDrafts(draftList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async (draft: Draft) => {
    setPosting(draft.id)
    setError(null)
    
    try {
      // ハッシュタグを含めたテキストを構築
      const hashtags = draft.hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')
      const tweetText = `${draft.content}\n\n${hashtags}`
      
      // 文字数チェック
      if (tweetText.length > 280) {
        throw new Error(`文字数が280文字を超えています（${tweetText.length}文字）`)
      }
      
      const response = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: tweetText })
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        // 下書きのステータスを更新
        await fetch(`/api/generation/drafts/${draft.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'POSTED',
            tweetId: result.id
          })
        })
        
        setPosted(new Set([...posted, draft.id]))
        
        // 投稿URLを表示
        if (result.url) {
          window.open(result.url, '_blank')
        }
      } else {
        throw new Error(result.error || '投稿に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿エラーが発生しました')
    } finally {
      setPosting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Twitter className="w-8 h-8 text-blue-500" />
                Twitter投稿
              </h1>
              <p className="mt-1 text-gray-600">
                下書きから選んで投稿しましょう
              </p>
            </div>
            <button
              onClick={fetchDrafts}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 下書きリスト */}
        {drafts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Twitter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">投稿可能な下書きがありません</p>
            <button
              onClick={() => router.push('/generation/content')}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              新しいコンテンツを生成
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const isPosted = posted.has(draft.id)
              const isPosting = posting === draft.id
              const tweetText = `${draft.content}\n\n${draft.hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')}`
              const charCount = tweetText.length
              const isOverLimit = charCount > 280
              
              return (
                <div key={draft.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{draft.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {draft.characterId === 'cardi-dare' ? 'カーディ・ダーレ' : 'スタンダード'}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePost(draft)}
                      disabled={isPosting || isPosted || isOverLimit}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                        isPosted
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : isOverLimit
                          ? 'bg-red-100 text-red-700 cursor-not-allowed'
                          : isPosting
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isPosted ? (
                        <>
                          <Check className="w-4 h-4" />
                          投稿済み
                        </>
                      ) : isPosting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          投稿中...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          投稿する
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* 投稿プレビュー */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-800 whitespace-pre-wrap">{draft.content}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draft.hashtags.map((tag, idx) => (
                        <span key={idx} className="text-blue-600">
                          #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* 文字数カウント */}
                  <div className="mt-3 flex justify-between items-center">
                    <span className={`text-sm ${
                      isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-600'
                    }`}>
                      {charCount} / 280文字
                    </span>
                    {isOverLimit && (
                      <span className="text-sm text-red-600">
                        {charCount - 280}文字オーバー
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* アクションボタン */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => router.push('/mission-control')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ダッシュボードに戻る
          </button>
          <button
            onClick={() => router.push('/generation/drafts')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            下書き管理
          </button>
        </div>
      </div>
    </div>
  )
}