'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, TrendingDown, Users, Eye, Heart, MessageCircle, 
  Share2, BarChart3, Calendar, Download, Filter 
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface AnalyticsData {
  totalPosts: number
  totalImpressions: number
  totalEngagements: number
  avgEngagementRate: number
  followerGrowth: number
  topPosts: Array<{
    id: string
    content: string
    engagementRate: number
    impressions: number
  }>
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/analytics?range=${timeRange}`)
      // const data = await response.json()
      
      // Mock data
      setAnalyticsData({
        totalPosts: 42,
        totalImpressions: 125430,
        totalEngagements: 5234,
        avgEngagementRate: 4.2,
        followerGrowth: 156,
        topPosts: [
          {
            id: '1',
            content: 'AIエージェントが変える未来の働き方...',
            engagementRate: 6.5,
            impressions: 8500
          }
        ]
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mock chart data
  const engagementData = [
    { date: '12/8', rate: 3.2 },
    { date: '12/9', rate: 4.1 },
    { date: '12/10', rate: 3.8 },
    { date: '12/11', rate: 5.2 },
    { date: '12/12', rate: 4.5 },
    { date: '12/13', rate: 4.8 },
    { date: '12/14', rate: 4.2 }
  ]

  const impressionsData = [
    { date: '12/8', impressions: 15000 },
    { date: '12/9', impressions: 18500 },
    { date: '12/10', impressions: 16200 },
    { date: '12/11', impressions: 22000 },
    { date: '12/12', impressions: 19800 },
    { date: '12/13', impressions: 21000 },
    { date: '12/14', impressions: 12930 }
  ]

  const contentTypeData = [
    { name: '教育的', value: 45, color: '#3B82F6' },
    { name: 'トレンド', value: 30, color: '#10B981' },
    { name: '個人的', value: 15, color: '#F59E0B' },
    { name: 'その他', value: 10, color: '#6B7280' }
  ]

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}時`,
    engagements: Math.floor(Math.random() * 500) + 100
  }))

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">アナリティクス</h2>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">過去24時間</SelectItem>
                <SelectItem value="7d">過去7日間</SelectItem>
                <SelectItem value="30d">過去30日間</SelectItem>
                <SelectItem value="90d">過去90日間</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              レポート出力
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総投稿数</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData?.totalPosts}</div>
                  <p className="text-xs text-muted-foreground">
                    前期間比 <span className="text-green-500">+12%</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">インプレッション</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData?.totalImpressions.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    前期間比 <span className="text-green-500">+25%</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">エンゲージメント</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData?.totalEngagements.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    前期間比 <span className="text-green-500">+18%</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">平均エンゲージメント率</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData?.avgEngagementRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    前期間比 <span className="text-red-500">-0.3%</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">フォロワー増加</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{analyticsData?.followerGrowth}</div>
                  <p className="text-xs text-muted-foreground">
                    現在のフォロワー: 1,856
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="posts">投稿分析</TabsTrigger>
                <TabsTrigger value="audience">オーディエンス</TabsTrigger>
                <TabsTrigger value="trends">トレンド</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>エンゲージメント率の推移</CardTitle>
                      <CardDescription>
                        過去{timeRange === '7d' ? '7日間' : timeRange === '30d' ? '30日間' : '24時間'}のエンゲージメント率
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={engagementData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="rate" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>インプレッション数の推移</CardTitle>
                      <CardDescription>
                        日別のインプレッション数
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={impressionsData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="impressions" 
                            stroke="#10B981" 
                            fill="#10B981" 
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>コンテンツタイプ別パフォーマンス</CardTitle>
                      <CardDescription>
                        投稿タイプごとの割合
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={contentTypeData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}%`}
                          >
                            {contentTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>時間帯別エンゲージメント</CardTitle>
                      <CardDescription>
                        24時間のエンゲージメント分布
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={hourlyData.filter((_, i) => i % 3 === 0)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="engagements" fill="#F59E0B" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="posts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>トップパフォーマンス投稿</CardTitle>
                    <CardDescription>
                      最も高いエンゲージメントを獲得した投稿
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData?.topPosts.map((post) => (
                        <div key={post.id} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="space-y-1 flex-1">
                            <p className="text-sm">{post.content}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>エンゲージメント率: {post.engagementRate}%</span>
                              <span>インプレッション: {post.impressions.toLocaleString()}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            詳細
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audience" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>オーディエンス分析</CardTitle>
                    <CardDescription>
                      フォロワーの属性と行動パターン
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      オーディエンス分析機能は準備中です
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>トレンド分析</CardTitle>
                    <CardDescription>
                      話題のトピックとハッシュタグ
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      トレンド分析機能は準備中です
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  )
}