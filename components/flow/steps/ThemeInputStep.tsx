'use client'

import { useState } from 'react'
import { Sparkles, TrendingUp, Brain } from 'lucide-react'

interface ThemeInputStepProps {
  initialTheme?: string
  onSubmit: (data: { theme: string; style: string; platform: string }) => void
  isLoading?: boolean
}

const STYLE_OPTIONS = [
  { value: 'エンターテイメント', label: 'エンターテイメント', icon: '🎭', description: '楽しく読めるバイラル向け' },
  { value: 'ビジネス', label: 'ビジネス', icon: '💼', description: 'プロフェッショナルな印象' },
  { value: '教育', label: '教育', icon: '📚', description: '学びのある内容重視' },
  { value: 'インスピレーション', label: 'インスピレーション', icon: '✨', description: '心に響くメッセージ' },
]

const PLATFORM_OPTIONS = [
  { value: 'Twitter', label: 'X (Twitter)', icon: '𝕏', description: '280文字の短文投稿' },
  { value: 'Threads', label: 'Threads', icon: '🧵', description: 'Metaのテキストベースアプリ' },
]

export function ThemeInputStep({ initialTheme = '', onSubmit, isLoading }: ThemeInputStepProps) {
  const [theme, setTheme] = useState(initialTheme)
  const [style, setStyle] = useState('エンターテイメント')
  const [platform, setPlatform] = useState('Twitter')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!theme.trim()) {
      setError('テーマを入力してください')
      return
    }
    
    if (theme.length < 5) {
      setError('テーマは5文字以上で入力してください')
      return
    }
    
    setError('')
    onSubmit({ theme: theme.trim(), style, platform })
  }

  return (
    <div className="space-y-6">
      {/* テーマ入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Brain className="inline w-4 h-4 mr-1" />
          コンテンツのテーマ
        </label>
        <div className="relative">
          <input
            type="text"
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value)
              setError('')
            }}
            placeholder="例: AIと働き方の未来、50代からのセカンドキャリア"
            className={`
              w-full px-4 py-3 border rounded-lg text-lg
              focus:ring-2 focus:ring-purple-500 focus:border-transparent
              ${error ? 'border-red-300' : 'border-gray-300'}
            `}
            disabled={isLoading}
          />
          {theme && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              {theme.length}文字
            </span>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-2 text-sm text-gray-600">
          Cardi Dareの視点で語りたいテーマを入力してください
        </p>
      </div>

      {/* スタイル選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Sparkles className="inline w-4 h-4 mr-1" />
          投稿スタイル
        </label>
        <div className="grid grid-cols-2 gap-3">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStyle(option.value)}
              disabled={isLoading}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${style === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* プラットフォーム選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <TrendingUp className="inline w-4 h-4 mr-1" />
          投稿プラットフォーム
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORM_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPlatform(option.value)}
              disabled={isLoading}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${platform === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl font-bold">{option.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 送信ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !theme.trim()}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${!isLoading && theme.trim()
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? '処理中...' : 'フロー開始'}
        </button>
      </div>
    </div>
  )
}