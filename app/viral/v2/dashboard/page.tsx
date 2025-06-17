'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DashboardData {
  viral: {
    activeSessions: any[]
    recentDrafts: any[]
    scheduledPosts: any[]
  }
  news: {
    todayTop10: any[]
    trendingTopics: any[]
    scheduledThreads: any[]
  }
  performance: {
    recentPosts: any[]
    scheduledRTs: any[]
    upcomingActions: any[]
  }
  stats: {
    totalSessions: number
    totalDrafts: number
    scheduledCount: number
    rtCount: number
  }
}

export default function UnifiedDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'viral' | 'news' | 'schedule'>('overview')

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // 30秒ごとに更新
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/viral/v2/dashboard')
      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              X BUZZ FLOW ダッシュボード
            </h1>
            <div className="flex items-center space-x-4">
              <Link
                href="/viral/v2/sessions/create"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                新規セッション
              </Link>
              <button
                onClick={fetchDashboardData}
                className="text-gray-600 hover:text-gray-900"
              >
                🔄 更新
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              概要
            </button>
            <button
              onClick={() => setActiveTab('viral')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'viral'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              バイラルコンテンツ
            </button>
            <button
              onClick={() => setActiveTab('news')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'news'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ニュース
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'schedule'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              スケジュール
            </button>
          </nav>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="アクティブセッション"
                value={data?.stats.totalSessions || 0}
                icon="🚀"
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                title="下書き"
                value={data?.stats.totalDrafts || 0}
                icon="📝"
                color="bg-green-50 text-green-600"
              />
              <StatCard
                title="予約投稿"
                value={data?.stats.scheduledCount || 0}
                icon="⏰"
                color="bg-yellow-50 text-yellow-600"
              />
              <StatCard
                title="予約RT"
                value={data?.stats.rtCount || 0}
                icon="🔄"
                color="bg-purple-50 text-purple-600"
              />
            </div>

            {/* クイックアクション */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction
                  title="バイラルセッション作成"
                  icon="🎯"
                  href="/viral/v2/sessions/create"
                />
                <QuickAction
                  title="10大ニュース生成"
                  icon="📰"
                  onClick={() => generateTop10News()}
                />
                <QuickAction
                  title="データ探索"
                  icon="🔍"
                  href="/viral/v2/data-explorer"
                />
                <QuickAction
                  title="スケジューラー"
                  icon="📅"
                  href="/viral/scheduler"
                />
              </div>
            </div>

            {/* タイムライン */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">今後の予定</h2>
              <div className="space-y-3">
                {data?.performance.upcomingActions.map((action: any) => (
                  <TimelineItem
                    key={action.id}
                    time={action.scheduledAt}
                    type={action.type}
                    title={action.title}
                    status={action.status}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'viral' && (
          <div className="space-y-6">
            {/* アクティブセッション */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">アクティブセッション</h2>
              </div>
              <div className="divide-y">
                {data?.viral.activeSessions.map(session => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </div>
            </div>

            {/* 最近の下書き */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">最近の下書き</h2>
              </div>
              <div className="divide-y">
                {data?.viral.recentDrafts.map(draft => (
                  <DraftRow key={draft.id} draft={draft} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-6">
            {/* 今日の10大ニュース */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">今日の10大ニュース</h2>
                <button
                  onClick={() => generateTop10News()}
                  className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                >
                  生成
                </button>
              </div>
              {data?.news.todayTop10.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  まだ生成されていません
                </p>
              ) : (
                <div className="space-y-2">
                  {data?.news.todayTop10.map((news, index) => (
                    <NewsItem key={news.id} news={news} rank={index + 1} />
                  ))}
                </div>
              )}
            </div>

            {/* トレンディングトピック */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">トレンディングトピック</h2>
              <div className="flex flex-wrap gap-2">
                {data?.news.trendingTopics.map(topic => (
                  <span
                    key={topic.id}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {topic.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* スケジュールビュー */}
            <ScheduleView
              scheduledPosts={data?.viral.scheduledPosts || []}
              scheduledRTs={data?.performance.scheduledRTs || []}
            />
          </div>
        )}
      </main>
    </div>
  )
}

// コンポーネント定義
function StatCard({ title, value, icon, color }: any) {
  return (
    <div className={`rounded-lg p-6 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

function QuickAction({ title, icon, href, onClick }: any) {
  const className = "flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer"
  
  if (href) {
    return (
      <Link href={href} className={className}>
        <span className="text-2xl mb-2">{icon}</span>
        <span className="text-sm text-center">{title}</span>
      </Link>
    )
  }
  
  return (
    <button onClick={onClick} className={className}>
      <span className="text-2xl mb-2">{icon}</span>
      <span className="text-sm text-center">{title}</span>
    </button>
  )
}

function TimelineItem({ time, type, title, status }: any) {
  const typeColors: any = {
    post: 'bg-blue-100 text-blue-700',
    rt: 'bg-purple-100 text-purple-700',
    news: 'bg-green-100 text-green-700'
  }
  
  return (
    <div className="flex items-center space-x-3">
      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[type]}`}>
        {type.toUpperCase()}
      </span>
      <span className="text-sm text-gray-600">
        {formatDistanceToNow(new Date(time), { locale: ja, addSuffix: true })}
      </span>
      <span className="text-sm font-medium">{title}</span>
    </div>
  )
}

function SessionRow({ session }: any) {
  return (
    <Link href={`/viral/v2/sessions/${session.id}`} className="block p-4 hover:bg-gray-50">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">{session.theme}</h3>
          <p className="text-sm text-gray-600">
            {session.platform} • {session.style}
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(session.createdAt), { locale: ja, addSuffix: true })}
        </span>
      </div>
    </Link>
  )
}

function DraftRow({ draft }: any) {
  return (
    <Link href={`/viral/drafts/${draft.id}`} className="block p-4 hover:bg-gray-50">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">{draft.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-1">
            {draft.content}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          draft.status === 'POSTED' ? 'bg-green-100 text-green-700' :
          draft.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {draft.status}
        </span>
      </div>
    </Link>
  )
}

function NewsItem({ news, rank }: any) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="flex items-start space-x-3 p-2">
      <span className="text-lg">
        {rank <= 3 ? medals[rank - 1] : `${rank}.`}
      </span>
      <div className="flex-1">
        <h4 className="font-medium text-sm">{news.title}</h4>
        <p className="text-xs text-gray-600 mt-1">{news.reason}</p>
      </div>
    </div>
  )
}

function ScheduleView({ scheduledPosts, scheduledRTs }: any) {
  const allItems = [
    ...scheduledPosts.map((p: any) => ({ ...p, type: 'post' })),
    ...scheduledRTs.map((r: any) => ({ ...r, type: 'rt' }))
  ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">スケジュール</h2>
      </div>
      <div className="divide-y">
        {allItems.map(item => (
          <div key={item.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.type === 'rt' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.type === 'rt' ? 'RT' : 'POST'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(item.scheduledAt).toLocaleString('ja-JP')}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {item.type === 'rt' ? item.originalContent : item.content}
                </p>
                {item.type === 'rt' && item.commentText && (
                  <p className="mt-1 text-sm text-gray-600 italic">
                    コメント: {item.commentText}
                  </p>
                )}
              </div>
              <div className="ml-4">
                <button className="text-sm text-red-600 hover:text-red-800">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// API呼び出し関数
async function generateTop10News() {
  try {
    const response = await fetch('/api/viral/v2/news/top10', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        theme: 'AI',
        characterId: 'cardi-dare',
        format: 'thread'
      })
    })
    
    if (response.ok) {
      alert('10大ニュースを生成しました')
      window.location.reload()
    } else {
      alert('生成に失敗しました')
    }
  } catch (error) {
    alert('エラーが発生しました')
  }
}