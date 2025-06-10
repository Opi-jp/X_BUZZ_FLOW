'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'

interface Analytics {
  id: string
  impressions: number
  likes: number
  retweets: number
  replies: number
  profileClicks: number
  linkClicks: number
  engagementRate: number
  measuredAt: string
  scheduledPost: {
    content: string
    postedAt: string
  }
}

interface Summary {
  totalPosts: number
  totalImpressions: number
  totalLikes: number
  totalRetweets: number
  avgEngagementRate: number
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [days, setDays] = useState('7')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics?days=${days}`)
      const data = await res.json()
      setAnalytics(data.analytics)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">分析</h1>
            <p className="mt-1 text-sm text-gray-600">
              投稿のパフォーマンスを分析します
            </p>
          </div>

          {/* 期間選択 */}
          <div className="mb-6">
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">過去7日間</option>
              <option value="14">過去14日間</option>
              <option value="30">過去30日間</option>
              <option value="90">過去90日間</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : (
            <>
              {/* サマリーカード */}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">総投稿数</p>
                    <p className="text-2xl font-bold">{summary.totalPosts}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">総インプレッション</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.totalImpressions)}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">総いいね</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.totalLikes)}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">総リツイート</p>
                    <p className="text-2xl font-bold">{formatNumber(summary.totalRetweets)}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-600">平均エンゲージメント率</p>
                    <p className="text-2xl font-bold">{summary.avgEngagementRate.toFixed(2)}%</p>
                  </div>
                </div>
              )}

              {/* 詳細リスト */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">投稿別パフォーマンス</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          投稿内容
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          投稿日時
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          インプレッション
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          いいね
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          RT
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          エンゲージメント率
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {analytics.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            分析データがありません
                          </td>
                        </tr>
                      ) : (
                        analytics.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-900 truncate max-w-xs">
                                {item.scheduledPost.content}
                              </p>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {formatDate(item.scheduledPost.postedAt)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">
                              {formatNumber(item.impressions)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">
                              {formatNumber(item.likes)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">
                              {formatNumber(item.retweets)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 text-right">
                              <span className={`font-medium ${
                                item.engagementRate > 5 ? 'text-green-600' : 
                                item.engagementRate > 2 ? 'text-yellow-600' : 'text-gray-600'
                              }`}>
                                {item.engagementRate.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}