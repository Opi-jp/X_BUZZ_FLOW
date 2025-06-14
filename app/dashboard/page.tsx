'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  FileText, 
  Zap, 
  Clock,
  ArrowRight,
  Activity,
  Eye,
  Heart,
  MessageCircle,
  Users,
  BarChart3,
  Brain,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">
            ダッシュボード
          </h1>
          <p className="text-lg text-muted-foreground">
            {session?.user?.username && `@${session.user.username} さん、`}
            今日も素晴らしいコンテンツを作りましょう！
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
            <Link href="/viral/cot" className="block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">新規CoT生成</CardTitle>
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AIでバイラルコンテンツを作成
                </p>
                <div className="flex items-center mt-4 text-primary">
                  <span className="text-sm font-medium">開始する</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-purple-500/50">
            <Link href="/news" className="block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">ニュース収集</CardTitle>
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <FileText className="w-6 h-6 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  最新ニュースをチェック
                </p>
                <div className="flex items-center mt-4 text-purple-500">
                  <span className="text-sm font-medium">開始する</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-green-500/50">
            <Link href="/buzz/posts" className="block">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">バズ分析</CardTitle>
                <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <Zap className="w-6 h-6 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  トレンド投稿を確認
                </p>
                <div className="flex items-center mt-4 text-green-500">
                  <span className="text-sm font-medium">開始する</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                本日の投稿
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.todayPosts || 0}</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                インプレッション
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalImpressions?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                +180.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                いいね
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalLikes?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                +19% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                コメント
              </CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalComments || 0}</div>
              <p className="text-xs text-muted-foreground">
                +201 since last hour
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                進行中のセッション
              </CardTitle>
              <CardDescription>
                現在アクティブなAI生成セッション
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.activeSessions > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">AI × 働き方</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Phase 3/5
                        </Badge>
                        <span className="text-sm text-muted-foreground">実行中</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href="/viral/cot">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/30" />
                  <p className="text-muted-foreground mt-2">
                    アクティブなセッションはありません
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/viral/cot">
                      新しいセッションを開始
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Draft Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                下書き状況
              </CardTitle>
              <CardDescription>
                作成したコンテンツの管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">未投稿の下書き</span>
                    <Badge variant="outline">{stats?.totalDrafts || 0}件</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">本日作成</span>
                    <Badge variant="outline">5件</Badge>
                  </div>
                </div>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/viral/drafts">
                    下書きを管理
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}