'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, Sparkles } from 'lucide-react'

export default function CreatePage() {
  const router = useRouter()
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startFlow = async () => {
    if (!theme.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'フロー開始に失敗しました')
      }

      const data = await response.json()
      
      // フロー詳細ページへ遷移
      router.push(`/create/flow/${data.id}`)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-purple-100 rounded-full">
              <Brain className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AIバイラルコンテンツ生成
          </h1>
          <p className="text-gray-600">
            テーマを入力するだけで、バズる投稿を自動生成します
          </p>
        </div>

        {/* メインフォーム */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="space-y-6">
            {/* テーマ入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿テーマ
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && startFlow()}
                  placeholder="例: AIと働き方の未来、Web3の可能性、etc..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                />
                <Sparkles className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* 開始ボタン */}
            <button
              onClick={startFlow}
              disabled={!theme.trim() || loading}
              className="w-full py-3 px-6 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成を開始しています...
                </span>
              ) : (
                '生成開始'
              )}
            </button>
          </div>

          {/* ヒント */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              💡 ヒント: 具体的で時事性のあるテーマほど、バズりやすい投稿が生成されます
            </p>
          </div>
        </div>

        {/* 既存の下書きへのリンク */}
        <div className="mt-8 text-center">
          <a
            href="/drafts"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            下書き一覧を見る →
          </a>
        </div>
      </div>
    </div>
  )
}