'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react'

interface PerformanceData {
  date: string
  impressions: number
  engagements: number
  engagementRate: number
}

interface TimeSlotData {
  hour: number
  avgEngagement: number
  postCount: number
}

interface ContentTypeData {
  type: string
  count: number
  avgEngagement: number
}

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444']

export default function PostPerformance() {
  const [timeRange, setTimeRange] = useState('7d')
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotData[]>([])
  const [contentTypeData, setContentTypeData] = useState<ContentTypeData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPerformanceData()
  }, [timeRange])

  const fetchPerformanceData = async () => {
    try {
      // TODO: 実際のAPIエンドポイントに置き換え
      const mockData: PerformanceData[] = [
        { date: '6/8', impressions: 12000, engagements: 480, engagementRate: 4.0 },
        { date: '6/9', impressions: 15000, engagements: 750, engagementRate: 5.0 },
        { date: '6/10', impressions: 18000, engagements: 720, engagementRate: 4.0 },
        { date: '6/11', impressions: 22000, engagements: 1320, engagementRate: 6.0 },
        { date: '6/12', impressions: 19000, engagements: 950, engagementRate: 5.0 },
        { date: '6/13', impressions: 25000, engagements: 1750, engagementRate: 7.0 },
        { date: '6/14', impressions: 21000, engagements: 1050, engagementRate: 5.0 },
      ]
      setPerformanceData(mockData)

      const mockTimeSlots: TimeSlotData[] = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        avgEngagement: Math.random() * 100 + 20,
        postCount: Math.floor(Math.random() * 10)
      }))
      setTimeSlotData(mockTimeSlots)

      const mockContentTypes: ContentTypeData[] = [
        { type: '教育的', count: 25, avgEngagement: 850 },
        { type: 'エンタメ', count: 18, avgEngagement: 1200 },
        { type: '解説', count: 30, avgEngagement: 650 },
        { type: '個人的', count: 15, avgEngagement: 450 },
      ]
      setContentTypeData(mockContentTypes)
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalImpressions = performanceData.reduce((sum, d) => sum + d.impressions, 0)
  const totalEngagements = performanceData.reduce((sum, d) => sum + d.engagements, 0)
  const avgEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions * 100).toFixed(2) : '0'

  const bestTimeSlot = timeSlotData.reduce((best, current) => 
    current.avgEngagement > best.avgEngagement ? current : best
  , { hour: 0, avgEngagement: 0, postCount: 0 })

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総インプレッション</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalImpressions.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総エンゲージメント</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalEngagements.toLocaleString()}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">平均エンゲージメント率</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgEngagementRate}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">最適投稿時間</p>
              <p className="text-2xl font-bold text-gray-900">
                {bestTimeSlot.hour}:00
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* パフォーマンストレンド */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">パフォーマンストレンド</h3>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">過去7日間</option>
            <option value="30d">過去30日間</option>
            <option value="90d">過去90日間</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="impressions" 
              stroke="#3B82F6" 
              name="インプレッション"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="engagements" 
              stroke="#10B981" 
              name="エンゲージメント"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 時間帯別パフォーマンス */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">時間帯別パフォーマンス</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timeSlotData.filter(d => d.postCount > 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgEngagement" fill="#8B5CF6" name="平均エンゲージメント" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* コンテンツタイプ別分析 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">コンテンツタイプ別分析</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={contentTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, count }) => `${type} (${count})`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {contentTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI インサイト */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AIインサイト</h3>
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">🎯 最適化提案</p>
            <p className="mt-1 text-sm text-gray-600">
              午後7時〜10時の投稿はエンゲージメント率が平均より40%高い傾向があります。
              この時間帯への投稿を増やすことをお勧めします。
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">📈 トレンド予測</p>
            <p className="mt-1 text-sm text-gray-600">
              「エンタメ」カテゴリのコンテンツが高いパフォーマンスを示しています。
              週末に向けて、よりカジュアルなトーンの投稿を増やすと良いでしょう。
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">💡 改善ポイント</p>
            <p className="mt-1 text-sm text-gray-600">
              ハッシュタグ「#AI」を含む投稿は、含まない投稿より平均25%高いリーチを獲得しています。
              関連するハッシュタグの活用を検討してください。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}