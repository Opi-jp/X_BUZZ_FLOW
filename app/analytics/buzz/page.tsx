'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Link from 'next/link'
import { formatDateJST, formatDateTimeJST } from '@/lib/date-utils'

interface BuzzPostAnalytics {
  theme: string
  count: number
  avgLikes: number
  avgRetweets: number
  avgImpressions: number
  avgEngagementRate: number
  topPosts: {
    id: string
    content: string
    authorUsername: string
    likesCount: number
    retweetsCount: number
    impressionsCount: number
    engagementRate: number
    url: string
  }[]
}

interface AIReplacementInsight {
  jobCategory: string
  examples: number
  trend: 'increasing' | 'stable' | 'decreasing'
  keyPhrases: string[]
}

export default function BuzzAnalyticsPage() {
  const [analytics, setAnalytics] = useState<BuzzPostAnalytics[]>([])
  const [aiInsights, setAiInsights] = useState<AIReplacementInsight[]>([])
  const [dateRange, setDateRange] = useState('7')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'themes' | 'ai-replacement'>('themes')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/buzz?days=${dateRange}`)
      const data = await res.json()
      setAnalytics(data.analytics || [])
      setAiInsights(data.aiInsights || [])
    } catch (error) {
      console.error('Error fetching buzz analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">バズ投稿分析</h1>
            <p className="mt-1 text-sm text-gray-600">
              収集したバズツイートの傾向とAI代替の洞察
            </p>
          </div>

          {/* ナビゲーションタブ */}
          <div className="flex gap-4 mb-6">
            <Link 
              href="/analytics"
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              自分の投稿分析
            </Link>
            <div className="px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600">
              バズ投稿分析
            </div>
          </div>

          {/* 期間選択 */}
          <div className="mb-6 flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">過去24時間</option>
              <option value="7">過去7日間</option>
              <option value="30">過去30日間</option>
              <option value="90">過去90日間</option>
            </select>
          </div>

          {/* サブタブ */}
          <div className="flex border-b mb-6">
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'themes' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              テーマ別分析
            </button>
            <button
              onClick={() => setActiveTab('ai-replacement')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'ai-replacement' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AI代替インサイト
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : (
            <>
              {activeTab === 'themes' && (
                <div className="space-y-6">
                  {analytics.map((theme) => (
                    <div key={theme.theme} className="bg-white rounded-lg shadow p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">{theme.theme}</h3>
                        <p className="text-sm text-gray-600">{theme.count}件の投稿</p>
                      </div>
                      
                      {/* メトリクス */}
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-gray-600">平均いいね</p>
                          <p className="text-xl font-bold">{formatNumber(theme.avgLikes)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">平均RT</p>
                          <p className="text-xl font-bold">{formatNumber(theme.avgRetweets)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">平均インプレッション</p>
                          <p className="text-xl font-bold">{formatNumber(theme.avgImpressions)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">平均エンゲージメント率</p>
                          <p className="text-xl font-bold">{theme.avgEngagementRate.toFixed(2)}%</p>
                        </div>
                      </div>
                      
                      {/* トップ投稿 */}
                      {theme.topPosts.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">トップ投稿</h4>
                          <div className="space-y-3">
                            {theme.topPosts.slice(0, 3).map((post) => (
                              <div key={post.id} className="border rounded p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-sm font-medium">@{post.authorUsername}</p>
                                  <a 
                                    href={post.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    元投稿
                                  </a>
                                </div>
                                <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                  {post.content}
                                </p>
                                <div className="flex gap-4 text-xs text-gray-500">
                                  <span>❤️ {formatNumber(post.likesCount)}</span>
                                  <span>🔄 {formatNumber(post.retweetsCount)}</span>
                                  <span>👁 {formatNumber(post.impressionsCount)}</span>
                                  <span className="font-medium">
                                    📊 {post.engagementRate.toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {activeTab === 'ai-replacement' && (
                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      💡 AI代替インサイトは、収集したツイートから「仕事の代替」に関する言及を分析しています
                    </p>
                  </div>
                  
                  {aiInsights.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                      <p className="text-gray-500">
                        AI代替に関する十分なデータがまだありません。
                        より多くのデータを収集してください。
                      </p>
                    </div>
                  ) : (
                    aiInsights.map((insight) => (
                      <div key={insight.jobCategory} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{insight.jobCategory}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            insight.trend === 'increasing' 
                              ? 'bg-red-100 text-red-800' 
                              : insight.trend === 'decreasing'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {insight.trend === 'increasing' ? '増加傾向' : 
                             insight.trend === 'decreasing' ? '減少傾向' : '横ばい'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4">
                          {insight.examples}件の関連事例
                        </p>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">頻出キーワード：</p>
                          <div className="flex flex-wrap gap-2">
                            {insight.keyPhrases.map((phrase, i) => (
                              <span 
                                key={i}
                                className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                              >
                                {phrase}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}