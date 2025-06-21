'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, Loader2, ArrowRight, Copy, Check, Twitter, Send } from 'lucide-react'

interface Post {
  conceptId: string
  conceptTitle: string
  characterId: string
  format: 'single' | 'thread'
  content?: string
  posts?: Array<{
    content: string
    order: number
  }>
  tone: string
  callToAction: string
  engagementHooks: string[]
}

interface Session {
  id: string
  theme: string
  platform: string
  style: string
  claudeData: Post[]
  status: string
  currentPhase: string
  drafts: any[]
}

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<string | null>(null)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/create/flow/list/${sessionId}`)
      if (!response.ok) throw new Error('セッションの取得に失敗しました')
      
      const data = await response.json()
      setSession(data.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, postId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(postId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handlePostToTwitter = async (post: Post) => {
    // Twitter投稿APIを呼び出す
    try {
      // 投稿内容を構築
      const content = post.format === 'thread' 
        ? post.posts?.map(p => p.content).join('\n\n') || ''
        : post.content || ''
      
      // ハッシュタグを追加
      const hashtags = ['AI時代', 'カーディダーレ']
      const tweetText = `${content}\n\n${hashtags.map(tag => `#${tag}`).join(' ')}`
      
      const response = await fetch('/api/publish/post/now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetText
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          alert(`投稿しました！\nURL: ${result.url}`)
          // 下書きをデータベースに保存
          await fetch('/api/create/draft/list', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              conceptId: post.conceptId,
              title: post.conceptTitle,
              content,
              hashtags,
              status: 'POSTED',
              characterId: post.characterId,
              tweetId: result.id
            })
          })
          fetchSession() // リロード
        }
      } else {
        throw new Error('投稿に失敗しました')
      }
    } catch (error) {
      alert('投稿エラー: ' + (error instanceof Error ? error.message : 'Unknown error'))
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold text-red-900">エラー</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchSession}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (!session || !session.claudeData || session.claudeData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">生成された投稿が見つかりません</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            戻る
          </button>
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
              <h1 className="text-2xl font-bold text-gray-900">生成結果</h1>
              <p className="mt-1 text-gray-600">
                {session.claudeData.length}個の投稿が生成されました
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">セッションID</p>
              <p className="font-mono text-xs text-gray-600">{sessionId}</p>
            </div>
          </div>

          {/* 進捗インジケーター */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm text-gray-700">トピック収集</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm text-gray-700">コンセプト生成</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm text-gray-700">コンセプト選択</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm text-gray-700">キャラクター選択</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm font-semibold text-gray-900">投稿生成</span>
              </div>
            </div>
          </div>
        </div>

        {/* 生成された投稿 */}
        <div className="space-y-6">
          {session.claudeData.map((post) => (
            <div key={post.conceptId} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {post.conceptTitle}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        post.format === 'thread' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {post.format === 'thread' ? 'スレッド' : '単独投稿'}
                      </span>
                      <span className="text-sm text-gray-600">
                        キャラクター: {post.characterId === 'cardi-dare' ? 'カーディ・ダーレ' : 'スタンダード'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(
                        post.format === 'thread' 
                          ? post.posts?.map(p => p.content).join('\n\n') || ''
                          : post.content || '',
                        post.conceptId
                      )}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {copiedId === post.conceptId ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handlePostToTwitter(post)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 投稿内容 */}
                <div className="space-y-4">
                  {post.format === 'thread' && post.posts ? (
                    post.posts.map((p, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-medium text-gray-500">
                            {idx + 1}.
                          </span>
                          <p className="text-gray-800 whitespace-pre-wrap flex-1">
                            {p.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>
                  )}
                </div>

                {/* メタデータ */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">トーン:</span>
                      <span className="ml-2">{post.tone}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">CTA:</span>
                      <span className="ml-2">{post.callToAction}</span>
                    </div>
                  </div>
                  {post.engagementHooks && post.engagementHooks.length > 0 && (
                    <div className="mt-2">
                      <span className="text-gray-600 text-sm">エンゲージメントフック:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {post.engagementHooks.map((hook, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                          >
                            {hook}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* アクションボタン */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => router.push('/mission-control')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ダッシュボードに戻る
          </button>
          <button
            onClick={() => router.push('/generation/content')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            新しいセッションを開始
          </button>
        </div>
      </div>
    </div>
  )
}