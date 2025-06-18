'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 統合ハブページ - すべての機能への入り口
export default function ViralHubPage() {
  const router = useRouter()
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalDrafts: 0,
    publishedPosts: 0,
    scheduledPosts: 0
  })
  
  useEffect(() => {
    fetchDashboardData()
  }, [])
  
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/viral/v2/dashboard')
      const data = await response.json()
      if (data.stats) {
        setStats(data.stats)
      }
      if (data.recentActivity) {
        setRecentActivity(data.recentActivity)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  const runV2E2ETest = async () => {
    try {
      alert('V2 E2Eテスト開始...')
      
      // 1. セッション作成
      const createResponse = await fetch('/api/viral/v2/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: 'AIと働き方',
          platform: 'Twitter',
          style: '洞察的'
        })
      })
      const session = await createResponse.json()
      const sessionId = session.id
      
      // 2. トピック収集
      const topicsResponse = await fetch(`/api/viral/v2/sessions/${sessionId}/collect-topics`, {
        method: 'POST'
      })
      if (!topicsResponse.ok) throw new Error('トピック収集失敗')
      
      // 3. コンセプト生成
      const conceptsResponse = await fetch(`/api/viral/v2/sessions/${sessionId}/generate-concepts`, {
        method: 'POST'
      })
      if (!conceptsResponse.ok) throw new Error('コンセプト生成失敗')
      const conceptsData = await conceptsResponse.json()
      
      // 4. コンテンツ生成方法の選択
      const choice = confirm(
        'コンテンツ生成方法を選択:\n' +
        'OK: 通常のGPT生成\n' +
        'キャンセル: カーディ・ダーレキャラクター生成'
      )
      
      if (choice) {
        // 通常のコンテンツ生成
        const concepts = conceptsData.session.concepts || []
        const selectedIds = concepts.slice(0, 3).map((c: any) => c.conceptId)
        
        const contentsResponse = await fetch(`/api/viral/v2/sessions/${sessionId}/generate-contents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedIds })
        })
        if (!contentsResponse.ok) throw new Error('コンテンツ生成失敗')
        
        alert(`V2 E2Eテスト完了！\nセッションID: ${sessionId}\n下書きが作成されました`)
        router.push(`/viral/v2/sessions/${sessionId}`)
      } else {
        // キャラクター生成へリダイレクト
        alert(`V2 E2Eテスト（コンセプト生成まで）完了！\nキャラクター選択画面に移動します`)
        router.push(`/viral/character-selector?sessionId=${sessionId}`)
      }
      
    } catch (error) {
      alert(`V2 E2Eテスト失敗: ${error.message}`)
    }
  }

  const runCoTE2ETest = async () => {
    try {
      alert('CoT E2Eテスト開始...')
      
      // 1. CoTセッション作成
      const createResponse = await fetch('/api/viral/cot-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: 'AIと働き方',
          platform: 'Twitter',
          style: '洞察的'
        })
      })
      const session = await createResponse.json()
      const sessionId = session.id
      
      // 2. 非同期処理開始
      const processResponse = await fetch(`/api/viral/cot-session/${sessionId}/process-async`, {
        method: 'POST'
      })
      if (!processResponse.ok) throw new Error('CoT処理開始失敗')
      
      alert(`CoT E2Eテスト開始！\nセッションID: ${sessionId}\n約5分で完了予定`)
      router.push(`/viral/cot/session/${sessionId}`)
      
    } catch (error) {
      alert(`CoT E2Eテスト失敗: ${error.message}`)
    }
  }
  
  const features = [
    {
      title: 'V2システム（高速版）',
      description: 'Perplexityで直接トレンド収集',
      icon: '🚀',
      href: '/viral/v2',
      color: 'bg-blue-500',
      features: [
        'Perplexityに自然言語で質問',
        '3つのトピックを高速収集',
        'ステップバイステップUI',
        'キャラクター生成対応'
      ]
    },
    {
      title: 'プロンプトエディター',
      description: 'プロンプトの調整・カスタマイズ',
      icon: '🔧',
      href: '/viral/prompt-editor',
      color: 'bg-teal-500',
      features: [
        'カーディ・ダーレプロンプト編集',
        'キャラクター生成プロンプト調整',
        'コンセプト生成プロンプト編集',
        'リアルタイムプレビュー機能'
      ]
    },
    {
      title: 'CoTシステム（詳細版）',
      description: 'GPTで動的に検索戦略を生成',
      icon: '🧠',
      href: '/viral/cot',
      color: 'bg-purple-500',
      features: [
        'GPTが検索クエリを動的生成',
        '5フェーズの詳細分析',
        '非同期処理で並列実行',
        '詳細な戦略立案'
      ]
    },
    {
      title: '下書き管理',
      description: '生成されたコンテンツの編集と投稿',
      icon: '📝',
      href: '/viral/v2/drafts',
      color: 'bg-green-500',
      features: [
        '下書き一覧表示',
        'コンテンツ編集',
        '即座投稿',
        'スケジュール設定'
      ]
    },
    {
      title: 'ニュース機能',
      description: '10大ニュースとカーディ視点',
      icon: '📰',
      href: '/viral/v2/news',
      color: 'bg-orange-500',
      features: [
        '今日の10大ニュース',
        'カーディの辛口コメント',
        'ニュースからバイラル変換',
        'トレンド分析'
      ]
    },
    {
      title: 'データエクスプローラー',
      description: '過去のデータを再利用',
      icon: '🔍',
      href: '/viral/v2/data-explorer',
      color: 'bg-indigo-500',
      features: [
        'トピック検索',
        'コンセプト検索',
        'パフォーマンス分析',
        'データ再利用'
      ]
    },
    {
      title: 'スマートスケジューラー',
      description: 'セルフRTと最適投稿時間',
      icon: '📅',
      href: '/viral/v2/smart-scheduler',
      color: 'bg-pink-500',
      features: [
        '6時間後のセルフRT',
        '最適時間の自動計算',
        'カーディのコメント付きRT',
        '週末戦略'
      ]
    }
  ]
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">X BUZZ FLOW</h1>
              <p className="text-gray-600 mt-1">
                AIを活用したバイラルコンテンツ生成プラットフォーム
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/viral/v2/dashboard"
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                ダッシュボード
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* 統計情報 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <div className="text-sm text-gray-600">総セッション数</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold">{stats.totalDrafts}</div>
            <div className="text-sm text-gray-600">下書き数</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold">{stats.publishedPosts}</div>
            <div className="text-sm text-gray-600">投稿済み</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold">{stats.scheduledPosts}</div>
            <div className="text-sm text-gray-600">予約投稿</div>
          </div>
        </div>
        
        {/* E2Eテストボタン */}
        <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🔗 E2Eテストフロー</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                if (confirm('V2システムのE2Eテストを実行しますか？（約2分）')) {
                  await runV2E2ETest()
                }
              }}
              className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <div className="font-semibold">V2システム E2E</div>
              <div className="text-sm opacity-90">セッション → トピック → コンセプト → コンテンツ → 下書き</div>
            </button>
            <button
              onClick={async () => {
                if (confirm('CoTシステムのE2Eテストを実行しますか？（約5分）')) {
                  await runCoTE2ETest()
                }
              }}
              className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <div className="font-semibold">CoTシステム E2E</div>
              <div className="text-sm opacity-90">Phase1-5 → 非同期処理 → 自動下書き作成</div>
            </button>
          </div>
        </div>

        {/* 機能カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.href}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(feature.href)}
            >
              <div className={`h-2 ${feature.color} rounded-t-lg`}></div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{feature.icon}</div>
                  <div className="flex-1 ml-4">
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {feature.features.map((f, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-right">
                  <span className="text-sm text-blue-600 hover:text-blue-700">
                    使ってみる →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 最近のアクティビティ */}
        {recentActivity.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">最近のアクティビティ</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y divide-gray-200">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{activity.title}</div>
                        <div className="text-sm text-gray-600">{activity.description}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(activity.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* クイックスタート */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">クイックスタート</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">🚀 初めての方へ</h3>
              <p className="text-gray-700 mb-4">
                V2システムから始めることをお勧めします。Perplexityが自動でトレンドを収集し、
                すぐにコンテンツを生成できます。
              </p>
              <Link
                href="/viral/v2"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                V2システムを試す
              </Link>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🧠 上級者の方へ</h3>
              <p className="text-gray-700 mb-4">
                CoTシステムでより詳細な分析と戦略立案が可能です。
                GPTが動的に検索戦略を生成し、5段階の分析を行います。
              </p>
              <Link
                href="/viral/cot"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                CoTシステムを試す
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}