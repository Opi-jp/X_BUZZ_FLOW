'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar,
  Clock,
  Send,
  BarChart3,
  Settings,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Repeat,
  Timer,
  Activity
} from 'lucide-react'
import Link from 'next/link'

interface ScheduledPost {
  id: string
  content: string
  scheduledAt: string
  platform: string
  status: 'pending' | 'published' | 'failed'
  draftId: string
}

interface PostPerformance {
  id: string
  content: string
  postedAt: string
  likes: number
  retweets: number
  comments: number
  impressions: number
  engagementRate: number
}

interface AutomationSettings {
  autoPost: boolean
  optimalTiming: boolean
  performanceTracking: boolean
  rtEnabled: boolean
}

export function AutomationPanel() {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [recentPosts, setRecentPosts] = useState<PostPerformance[]>([])
  const [settings, setSettings] = useState<AutomationSettings>({
    autoPost: false,
    optimalTiming: true,
    performanceTracking: true,
    rtEnabled: false
  })
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todayPosts: 0,
    weeklyPosts: 0,
    avgEngagement: 0,
    bestPostingTime: '19:00'
  })

  useEffect(() => {
    fetchAutomationData()
    const interval = setInterval(fetchAutomationData, 30000) // 30秒ごとに更新
    return () => clearInterval(interval)
  }, [])

  const fetchAutomationData = async () => {
    try {
      // スケジュール済み投稿を取得
      const scheduledRes = await fetch('/api/viral/v2/scheduled-posts')
      const scheduledData = await scheduledRes.json()
      setScheduledPosts(scheduledData.posts || [])

      // 最近の投稿パフォーマンスを取得
      const performanceRes = await fetch('/api/viral/performance/recent?limit=5')
      const performanceData = await performanceRes.json()
      setRecentPosts(performanceData.posts || [])

      // 統計情報を取得
      const statsRes = await fetch('/api/dashboard/stats')
      const statsData = await statsRes.json()
      setStats({
        todayPosts: statsData.todayPosts || 0,
        weeklyPosts: statsData.weeklyPosts || 0,
        avgEngagement: statsData.avgEngagementRate || 0,
        bestPostingTime: '19:00' // TODO: 実際の最適時間を計算
      })

    } catch (error) {
      console.error('Failed to fetch automation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = async (key: keyof AutomationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    
    // 設定を保存
    try {
      await fetch('/api/settings/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const getNextPostTime = () => {
    const nextPost = scheduledPosts
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
    
    if (!nextPost) return null
    
    const timeUntil = new Date(nextPost.scheduledAt).getTime() - Date.now()
    const hours = Math.floor(timeUntil / (1000 * 60 * 60))
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60))
    
    return { post: nextPost, hours, minutes }
  }

  const nextPostInfo = getNextPostTime()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Automation - 自動化・投稿管理</h2>
        <Link href="/viral/v2/smart-scheduler">
          <Button>
            <Calendar className="w-4 h-4 mr-2" />
            スケジューラー
          </Button>
        </Link>
      </div>

      {/* Next Post Alert */}
      {nextPostInfo && (
        <Alert className="bg-green-50 border-green-200">
          <Timer className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            次の投稿まで <strong>{nextPostInfo.hours}時間{nextPostInfo.minutes}分</strong>
            <span className="ml-2 text-sm">
              ({new Date(nextPostInfo.post.scheduledAt).toLocaleString('ja-JP')})
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            自動化設定
          </CardTitle>
          <CardDescription>
            投稿の自動化とパフォーマンス追跡の設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">自動投稿</label>
              <p className="text-sm text-gray-600">
                スケジュールに従って自動的に投稿
              </p>
            </div>
            <Switch
              checked={settings.autoPost}
              onCheckedChange={(checked) => handleSettingChange('autoPost', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">最適時間投稿</label>
              <p className="text-sm text-gray-600">
                エンゲージメントが高い時間帯に投稿
              </p>
            </div>
            <Switch
              checked={settings.optimalTiming}
              onCheckedChange={(checked) => handleSettingChange('optimalTiming', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">パフォーマンス追跡</label>
              <p className="text-sm text-gray-600">
                投稿後の反応を自動的に記録
              </p>
            </div>
            <Switch
              checked={settings.performanceTracking}
              onCheckedChange={(checked) => handleSettingChange('performanceTracking', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">スマートRT</label>
              <p className="text-sm text-gray-600">
                ニュースに自動でコメント付きRT
              </p>
            </div>
            <Switch
              checked={settings.rtEnabled}
              onCheckedChange={(checked) => handleSettingChange('rtEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            予約投稿
          </CardTitle>
          <CardDescription>
            スケジュール済みの投稿一覧
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledPosts.length > 0 ? (
            <div className="space-y-3">
              {scheduledPosts.slice(0, 3).map((post) => (
                <div key={post.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.scheduledAt).toLocaleString('ja-JP')}
                        </span>
                        <Badge variant={post.status === 'pending' ? 'secondary' : 'default'}>
                          {post.status === 'pending' ? '予約中' : 
                           post.status === 'published' ? '投稿済み' : '失敗'}
                        </Badge>
                      </div>
                    </div>
                    {post.status === 'pending' && (
                      <Button variant="ghost" size="sm">
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>予約投稿はありません</p>
              <Link href="/viral/v2/smart-scheduler">
                <Button className="mt-4" size="sm" variant="outline">
                  投稿をスケジュール
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            パフォーマンス概要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.todayPosts}</p>
              <p className="text-sm text-gray-600">今日の投稿</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.weeklyPosts}</p>
              <p className="text-sm text-gray-600">今週の投稿</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.avgEngagement}%</p>
              <p className="text-sm text-gray-600">平均エンゲージメント</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.bestPostingTime}</p>
              <p className="text-sm text-gray-600">最適投稿時間</p>
            </div>
          </div>

          {/* Recent Post Performance */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">最近の投稿パフォーマンス</h4>
            {recentPosts.map((post) => (
              <div key={post.id} className="border rounded-lg p-3">
                <p className="text-sm line-clamp-1 mb-2">{post.content}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    {post.retweets}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post.comments}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {post.impressions.toLocaleString()}
                  </span>
                  <span className="ml-auto font-medium text-green-600">
                    {post.engagementRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Link href="/viral/performance">
            <Button className="w-full mt-4" variant="outline">
              詳細な分析を見る
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Automation Status */}
      <Alert className="bg-blue-50 border-blue-200">
        <Zap className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>自動化ステータス:</strong> {settings.autoPost ? 'アクティブ' : '停止中'}
          {settings.autoPost && (
            <span className="ml-2">
              • 次回投稿: {nextPostInfo ? 
                `${nextPostInfo.hours}時間${nextPostInfo.minutes}分後` : 
                '予約なし'}
            </span>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}