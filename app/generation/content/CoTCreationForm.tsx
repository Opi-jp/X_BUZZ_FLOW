'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Zap } from 'lucide-react'
// api-client削除: 直接fetch呼び出しに変更

export default function CoTCreationForm() {
  const router = useRouter()
  const [config, setConfig] = useState({
    theme: '',
    style: '洞察的',
    platform: 'Twitter'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!config.theme.trim()) {
      alert('発信テーマを入力してください')
      return
    }

    setLoading(true)
    
    try {
      // 直接APIエンドポイントを呼び出し
      const response = await fetch('/api/create/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      const result = await response.json()
      
      if (result.success && result.sessionId) {
        // セッション詳細ページにリダイレクト 
        router.push(`/create/flow/${result.sessionId}`)
      } else {
        throw new Error(result.error || 'セッション作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating session:', error)
      alert(error instanceof Error ? error.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4">
            <Brain className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            新しいCoTセッションを開始
          </h2>
          <p className="text-gray-600">
            あなたの発信テーマに特化したバイラルコンテンツを5段階で生成します
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
              発信テーマ *
            </label>
            <input
              id="theme"
              type="text"
              value={config.theme}
              onChange={(e) => setConfig({ ...config, theme: e.target.value })}
              placeholder="例: AIと働き方、Web3と教育、デジタルマーケティング"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              あなたが発信したいテーマを具体的に入力してください
            </p>
          </div>

          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
              コンテンツスタイル
            </label>
            <select
              id="style"
              value={config.style}
              onChange={(e) => setConfig({ ...config, style: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="洞察的">洞察的 - 深い分析と新しい視点</option>
              <option value="実用的">実用的 - 具体的で役立つ情報</option>
              <option value="教育的">教育的 - 学習・解説重視</option>
              <option value="エンターテイメント">エンターテイメント - 楽しく魅力的</option>
              <option value="論争的">論争的 - 議論を呼ぶ問題提起</option>
            </select>
          </div>

          <div>
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-2">
              投稿プラットフォーム
            </label>
            <select
              id="platform"
              value={config.platform}
              onChange={(e) => setConfig({ ...config, platform: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="Twitter">Twitter (X)</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="YouTube">YouTube</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  Chain of Thoughtプロセス
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Phase 1: トレンド収集と分析</li>
                  <li>• Phase 2: バイラル機会の評価</li>
                  <li>• Phase 3: コンセプト生成（3つのアプローチ）</li>
                  <li>• Phase 4: 完全なコンテンツ作成</li>
                  <li>• Phase 5: 実行戦略とKPI設定</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !config.theme.trim()}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                セッション作成中...
              </div>
            ) : (
              'Chain of Thought処理を開始'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>処理には通常2-3分かかります。途中経過をリアルタイムで確認できます。</p>
        </div>
      </div>
    </div>
  )
}