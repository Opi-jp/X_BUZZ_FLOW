'use client'

import { useState, useEffect, useRef } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

export default function GptViralDashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({
    expertise: 'AI × 働き方、25年のクリエイティブ経験',
    platform: 'Twitter',
    style: '解説 × エンタメ',
    model: 'gpt-4o'
  })
  const [showMenu, setShowMenu] = useState(false)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSessions()
    fetchModels()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/viral/gpt-session/list')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/viral/models')
      if (response.ok) {
        const data = await response.json()
        setAvailableModels(data.models || [])
        
        // デフォルトモデルが利用可能なモデルに含まれているか確認
        const modelIds = data.models.map((m: any) => m.id)
        if (!modelIds.includes(config.model) && data.models.length > 0) {
          setConfig(prev => ({ ...prev, model: data.models[0].id }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setModelsLoading(false)
    }
  }

  const createNewSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/viral/gpt-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = `/viral/gpt/session/${data.sessionId}`
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return formatInTimeZone(new Date(date), 'Asia/Tokyo', 'yyyy年MM月dd日 HH:mm', { locale: ja })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                GPTバイラル分析システム
              </h1>
              <p className="text-gray-600">
                ChatGPTの5段階分析でバズるコンテンツを自動生成
              </p>
            </div>
            
            {/* ナビゲーションメニュー */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                その他機能
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <h3 className="text-sm font-semibold text-gray-600 px-3 py-2">バイラル機能</h3>
                    <a href="/viral/gpt" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📊 GPT分析（現在のページ）
                    </a>
                    <a href="/viral/drafts" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📝 下書き管理
                    </a>
                    
                    <div className="border-t my-2"></div>
                    <h3 className="text-sm font-semibold text-gray-600 px-3 py-2">データ収集・管理</h3>
                    <a href="/dashboard-old" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      🏠 旧ダッシュボード
                    </a>
                    <a href="/collect" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      🔍 投稿収集
                    </a>
                    <a href="/posts" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📋 投稿一覧
                    </a>
                    <a href="/news" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📰 ニュース管理
                    </a>
                    
                    <div className="border-t my-2"></div>
                    <h3 className="text-sm font-semibold text-gray-600 px-3 py-2">投稿・分析</h3>
                    <a href="/create" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      ✏️ 投稿作成
                    </a>
                    <a href="/schedule" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📅 スケジュール管理
                    </a>
                    <a href="/analytics" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📈 分析レポート
                    </a>
                    <a href="/patterns" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      🎯 AIパターン管理
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 設定パネル */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">初期設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                専門分野
              </label>
              <input
                type="text"
                value={config.expertise}
                onChange={(e) => setConfig({ ...config, expertise: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プラットフォーム
              </label>
              <select
                value={config.platform}
                onChange={(e) => setConfig({ ...config, platform: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Twitter">Twitter</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="YouTube">YouTube</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スタイル
              </label>
              <select
                value={config.style}
                onChange={(e) => setConfig({ ...config, style: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="解説 × エンタメ">解説 × エンタメ</option>
                <option value="教育">教育</option>
                <option value="エンターテイメント">エンターテイメント</option>
                <option value="個人的な話">個人的な話</option>
              </select>
            </div>
            {/* モデル情報（固定） */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-900">
                  使用モデル: GPT-4o + Responses API（Web検索対応）
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                最新のニュースをリアルタイムで検索・分析します
              </p>
            </div>
          </div>
          
          <button
            onClick={createNewSession}
            disabled={loading}
            className="mt-6 w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? '作成中...' : '新規分析を開始'}
          </button>
        </div>

        {/* セッション一覧 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">分析履歴</h2>
          
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>まだ分析履歴がありません</p>
              <p className="text-sm mt-1">新規分析を開始してください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => window.location.href = `/viral/gpt/session/${session.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {session.metadata?.config?.platform || 'Twitter'}
                        </span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-600">
                          {session.metadata?.config?.style || '解説 × エンタメ'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(session.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        session.metadata?.completed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.metadata?.completed ? '完了' : `Step ${session.metadata?.currentStep || 0}/5`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}