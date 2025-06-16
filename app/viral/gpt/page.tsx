'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'
import Link from 'next/link'

export default function GptViralDashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({
    theme: '',
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

  const createChainOfThoughtSession = async () => {
    setLoading(true)
    try {
      // まず通常のセッションを作成
      const sessionResponse = await fetch('/api/viral/gpt-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json()
        
        // Chain of Thought Hybrid実行を開始
        const cotResponse = await fetch(`/api/viral/gpt-session/${sessionData.sessionId}/chain-hybrid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (cotResponse.ok) {
          const cotData = await cotResponse.json()
          // 結果ページに移動
          window.location.href = `/viral/gpt/session/${sessionData.sessionId}?cot=true`
        } else {
          console.error('Chain of Thought execution failed')
          // 通常のセッションページに移動
          window.location.href = `/viral/gpt/session/${sessionData.sessionId}`
        }
      }
    } catch (error) {
      console.error('Failed to create Chain of Thought session:', error)
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
                    <Link href="/viral/gpt" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📊 GPT分析（現在のページ）
                    </Link>
                    <Link href="/viral/drafts" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📝 下書き管理
                    </Link>
                    <Link href="/viral/gpt/auto-execute" className="block px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded font-semibold">
                      🚀 自動実行（新機能）
                    </Link>
                    
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
                発信テーマ
              </label>
              <input
                type="text"
                value={config.theme}
                onChange={(e) => setConfig({ ...config, theme: e.target.value })}
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
            {/* システム情報 */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-medium text-purple-900">
                  Hybrid Chain of Thought システム
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-purple-700">🔍 Phase 1: GPT-4o Responses APIでWeb検索（実記事URL取得）</p>
                <p className="text-blue-700">📊 Phase 2-4: Function Calling + JSON Modeで構造化分析</p>
                <p className="text-green-700">✨ 最低5個の実在記事から投稿準備完了コンテンツまで自動生成</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            {/* 実行モード選択 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">実行モードを選択</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                  <h4 className="font-medium text-gray-900 mb-1">📝 ステップ実行</h4>
                  <p className="text-xs text-gray-600 mb-2">各ステップを確認しながら進める</p>
                  <p className="text-xs text-green-600 mb-2">⏱ 各ステップ5-10秒</p>
                  <button
                    onClick={createNewSession}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg shadow hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                  >
                    {loading ? '作成中...' : 'ステップ実行'}
                  </button>
                </div>
                
                <div className="border border-purple-300 rounded-lg p-3 bg-purple-50">
                  <h4 className="font-medium text-purple-900 mb-1">🧠 Chain of Thought</h4>
                  <p className="text-xs text-purple-700 mb-2">Web検索＋詳細分析（高品質）</p>
                  <p className="text-xs text-orange-600 mb-2">⏱ 約50-60秒</p>
                  <button
                    onClick={createChainOfThoughtSession}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg shadow hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                  >
                    {loading ? '実行中...' : 'CoT実行'}
                  </button>
                </div>
                
                <div className="border border-green-300 rounded-lg p-3 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-1">⚡ 高速生成</h4>
                  <p className="text-xs text-green-700 mb-2">即座に投稿準備完了（最速）</p>
                  <p className="text-xs text-blue-600 mb-2">⏱ 5秒以内</p>
                  <button
                    onClick={async () => {
                      setLoading(true)
                      try {
                        const sessionResponse = await fetch('/api/viral/gpt-session/create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(config)
                        })
                        if (sessionResponse.ok) {
                          const sessionData = await sessionResponse.json()
                          const fastResponse = await fetch(`/api/viral/gpt-session/${sessionData.sessionId}/chain-fast`, {
                            method: 'POST'
                          })
                          if (fastResponse.ok) {
                            window.location.href = `/viral/gpt/session/${sessionData.sessionId}?fast=true`
                          }
                        }
                      } catch (error) {
                        console.error('Failed to create fast session:', error)
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg shadow hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                  >
                    {loading ? '生成中...' : '高速生成'}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                          : session.metadata?.chainHybridCompleted
                          ? 'bg-purple-100 text-purple-800'
                          : session.metadata?.usedChainFast
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.metadata?.completed ? '完了' : 
                         session.metadata?.chainHybridCompleted ? 'CoT完了' :
                         session.metadata?.usedChainFast ? '⚡高速完了' :
                         `Step ${session.metadata?.currentStep || 0}/5`}
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