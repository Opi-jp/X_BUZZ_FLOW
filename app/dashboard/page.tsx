'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { 
  TrendingUp, 
  FileText, 
  Zap, 
  Clock,
  ArrowRight,
  Activity,
  Eye,
  Heart,
  MessageCircle
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  todayPosts: number
  totalDrafts: number
  activeSessions: number
  totalImpressions: number
  totalLikes: number
  totalComments: number
  recentBuzzPosts: any[]
  recentNews: any[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchDashboardStats()
    }
  }, [session])

  const fetchDashboardStats = async () => {
    try {
      // TODO: 実際のAPIエンドポイントに置き換え
      setStats({
        todayPosts: 3,
        totalDrafts: 12,
        activeSessions: 2,
        totalImpressions: 45000,
        totalLikes: 1234,
        totalComments: 89,
        recentBuzzPosts: [],
        recentNews: []
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ダッシュボード
          </h1>
          <p className="mt-2 text-gray-600">
            {session?.user?.username && `@${session.user.username} さん、`}
            今日も素晴らしいコンテンツを作りましょう！
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/viral/cot"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 flex items-center justify-between transition-colors"
          >
            <div>
              <h3 className="font-semibold">新規CoT生成</h3>
              <p className="text-sm opacity-90 mt-1">AIでバイラルコンテンツを作成</p>
            </div>
            <TrendingUp className="w-8 h-8 opacity-80" />
          </Link>

          <Link
            href="/news"
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg p-6 flex items-center justify-between transition-colors"
          >
            <div>
              <h3 className="font-semibold">ニュース収集</h3>
              <p className="text-sm opacity-90 mt-1">最新ニュースをチェック</p>
            </div>
            <FileText className="w-8 h-8 opacity-80" />
          </Link>

          <Link
            href="/buzz/posts"
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 flex items-center justify-between transition-colors"
          >
            <div>
              <h3 className="font-semibold">バズ分析</h3>
              <p className="text-sm opacity-90 mt-1">トレンド投稿を確認</p>
            </div>
            <Zap className="w-8 h-8 opacity-80" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">本日の投稿</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.todayPosts || 0}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">インプレッション</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalImpressions?.toLocaleString() || 0}
                </p>
              </div>
              <Eye className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">いいね</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalLikes?.toLocaleString() || 0}
                </p>
              </div>
              <Heart className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">コメント</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalComments || 0}
                </p>
              </div>
              <MessageCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Sessions */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-500" />
                進行中のセッション
              </h2>
            </div>
            <div className="p-6">
              {stats?.activeSessions > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">AI × 働き方</p>
                      <p className="text-sm text-gray-600">Phase 3/5 実行中</p>
                    </div>
                    <Link
                      href="/viral/cot"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  アクティブなセッションはありません
                </p>
              )}
            </div>
          </div>

          {/* Draft Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-500" />
                下書き状況
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">未投稿の下書き</span>
                  <span className="font-semibold">{stats?.totalDrafts || 0}件</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">本日作成</span>
                  <span className="font-semibold">5件</span>
                </div>
                <Link
                  href="/viral/drafts"
                  className="block w-full text-center py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  下書きを管理
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}