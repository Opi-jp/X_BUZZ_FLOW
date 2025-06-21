'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Brain, AlertCircle, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

const PLATFORMS = [
  { id: 'Twitter', name: 'Twitter / X', icon: null }
]

const STYLES = [
  { id: '教育・解説', name: '教育・解説', description: '知識や情報を分かりやすく伝える' },
  { id: 'エンターテイメント', name: 'エンターテイメント', description: '楽しさや面白さを重視' },
  { id: '感動・共感', name: '感動・共感', description: '心に響くストーリー' },
  { id: 'ニュース・情報', name: 'ニュース・情報', description: '最新情報をいち早く' }
]

export default function GenerationContentPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [theme, setTheme] = useState('')
  const [platform, setPlatform] = useState('Twitter')
  const [style, setStyle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateSession = async () => {
    if (!theme || !style) {
      setError('テーマとスタイルを選択してください')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/create/flow/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme,
          platform,
          style
        })
      })

      if (!response.ok) {
        throw new Error('セッションの作成に失敗しました')
      }

      const data = await response.json()
      const sessionId = data.session?.id || data.sessionId
      
      // Perplexityでトピック収集を開始
      const collectResponse = await fetch(`/api/create/flow/list/${sessionId}/collect`, {
        method: 'POST'
      })

      if (collectResponse.ok) {
        // 収集が開始されたら、結果ページへリダイレクト
        router.push(`/generation/content/status/${sessionId}`)
      } else {
        throw new Error('トピック収集の開始に失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setCreating(false)
    }
  }

  // 未認証の場合
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">ログインが必要です</h2>
          <p className="text-gray-600 mb-6">
            コンテンツを生成するにはTwitterアカウントでログインしてください
          </p>
          <Link href="/auth/signin">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitterでログイン
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">新規コンテンツ生成</h1>
              <p className="text-gray-600">AIが最新トレンドからバイラルコンテンツを作成</p>
            </div>
          </div>
          
          {/* プロセスフロー */}
          <div className="flex items-center justify-between mt-6 px-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                1
              </div>
              <span className="ml-2 text-sm font-medium">設定</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold">
                2
              </div>
              <span className="ml-2 text-sm text-gray-500">トピック収集</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold">
                3
              </div>
              <span className="ml-2 text-sm text-gray-500">コンセプト生成</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold">
                4
              </div>
              <span className="ml-2 text-sm text-gray-500">投稿作成</span>
            </div>
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

        {/* 設定フォーム */}
        <div className="space-y-6">
          {/* テーマ入力 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-lg font-medium text-gray-900 mb-4">
              <Sparkles className="w-5 h-5 inline mr-2 text-yellow-500" />
              テーマを入力
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例: AIと働き方の未来、Z世代のトレンド、健康的な生活習慣..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-600">
              AIが最新情報を収集し、このテーマに関連したバイラルコンテンツを生成します
            </p>
          </div>

          {/* プラットフォーム選択 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-lg font-medium text-gray-900 mb-4">
              プラットフォーム
            </label>
            <div className="grid grid-cols-1 gap-3">
              {PLATFORMS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    platform === p.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="platform"
                    value={p.id}
                    checked={platform === p.id}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="sr-only"
                  />
                  {p.icon ? (
                    <p.icon className="w-6 h-6 text-gray-700 mr-3" />
                  ) : (
                    <svg className="w-6 h-6 text-gray-700 mr-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  )}
                  <span className="font-medium">{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* スタイル選択 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="block text-lg font-medium text-gray-900 mb-4">
              投稿スタイル
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {STYLES.map((s) => (
                <label
                  key={s.id}
                  className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    style === s.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="style"
                    value={s.id}
                    checked={style === s.id}
                    onChange={(e) => setStyle(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-medium text-gray-900">{s.name}</span>
                  <span className="text-sm text-gray-600 mt-1">{s.description}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 実行ボタン */}
          <div className="flex justify-end gap-4">
            <Link href="/mission-control">
              <button className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                キャンセル
              </button>
            </Link>
            <button
              onClick={handleCreateSession}
              disabled={creating || !theme || !style}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成を開始中...
                </>
              ) : (
                <>
                  生成を開始
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}