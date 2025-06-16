'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/app/components/layout/AppLayout'
import { 
  TrendingUp, 
  FileText, 
  BarChart3, 
  Sparkles, 
  Clock, 
  ArrowRight,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface ViralStats {
  totalSessions: number
  completedSessions: number
  totalDrafts: number
  publishedPosts: number
  avgEngagementRate: number
  recentSessions: any[]
}

export default function ViralOverviewPage() {
  const [stats, setStats] = useState<ViralStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // TODO: 実際のAPIエンドポイントに置き換え
      setStats({
        totalSessions: 24,
        completedSessions: 22,
        totalDrafts: 45,
        publishedPosts: 38,
        avgEngagementRate: 5.8,
        recentSessions: [
          {
            id: '1',
            theme: 'AI × 働き方',
            status: 'COMPLETED',
            createdAt: new Date().toISOString()
          }
        ]
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="w-8 h-8 mr-3 text-blue-500" />
          AIバイラルシステム
        </h1>
        <p className="mt-2 text-gray-600">
          Chain of Thoughtで高品質なバイラルコンテンツを生成・管理します
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          href="/viral/cot"
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">新規生成</h3>
              <p className="text-sm opacity-90 mt-1">CoTでコンテンツを作成</p>
            </div>
            <Sparkles className="w-8 h-8 opacity-80" />
          </div>
        </Link>

        <Link
          href="/viral/drafts"
          className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">下書き管理</h3>
              <p className="text-sm text-gray-600 mt-1">{stats?.totalDrafts || 0}件の下書き</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/viral/performance"
          className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">パフォーマンス</h3>
              <p className="text-sm text-gray-600 mt-1">詳細分析を見る</p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">総セッション数</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.totalSessions || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">完了セッション</p>
          <p className="text-2xl font-bold text-green-600">{stats?.completedSessions || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">公開済み投稿</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.publishedPosts || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">平均エンゲージメント率</p>
          <p className="text-2xl font-bold text-purple-600">{stats?.avgEngagementRate || 0}%</p>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-500" />
            最近のセッション
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : stats?.recentSessions.length ? (
            <div className="space-y-3">
              {stats.recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    {session.status === 'COMPLETED' ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{session.expertise}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(session.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/viral/cot/result/${session.id}`}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              まだセッションがありません
            </p>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 活用のヒント</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• 毎日1〜2回のCoT生成で、質の高いコンテンツを継続的に作成できます</li>
          <li>• 生成されたコンテンツはClaudeでリライトして、自分らしい文体に調整しましょう</li>
          <li>• パフォーマンス分析を参考に、最適な投稿時間を見つけてください</li>
          <li>• スケジュール機能を使って、計画的な投稿を心がけましょう</li>
        </ul>
      </div>
    </AppLayout>
  )
}