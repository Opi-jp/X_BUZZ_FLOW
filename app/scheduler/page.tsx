'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  Clock,
  FileText,
  Zap,
  MessageSquare,
  TrendingUp,
  Plus,
  RefreshCw,
  Eye,
  Heart,
  Share2,
  BarChart3,
  Settings,
  Newspaper,
  ListOrdered,
  MessageCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

// Placeholder component for ScheduleCalendar
function ScheduleCalendar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>投稿カレンダー</CardTitle>
        <CardDescription>
          月間の投稿スケジュールを管理
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          カレンダー機能は開発中です
        </div>
      </CardContent>
    </Card>
  )
}

interface PostingRule {
  minInterval: number // minutes
  maxPerDay: number
  activeHours: { start: number; end: number }
}

interface ScheduledContent {
  id: string
  type: 'ai_generated' | 'news_comment' | 'news_summary' | 'buzz_comment' | 'manual'
  title: string
  content: string
  scheduledAt: Date
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
  sourceData?: {
    newsId?: string
    buzzPostId?: string
    articleTitle?: string
    originalAuthor?: string
    engagement?: {
      likes: number
      retweets: number
      impressions: number
    }
  }
  expectedEngagement?: {
    score: number
    reasoning: string
  }
}

export default function SchedulerPage() {
  const { data: session, status } = useSession()
  const [rules, setRules] = useState<PostingRule>({
    minInterval: 120,
    maxPerDay: 10,
    activeHours: { start: 6, end: 24 }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }
  }, [status])

  useEffect(() => {
    if (session) {
      fetchScheduledContent()
    }
  }, [session])

  const fetchScheduledContent = async () => {
    try {
      // TODO: 実際のAPIに置き換え
      const mockData: ScheduledContent[] = [
        {
          id: '1',
          type: 'news_comment',
          title: '【速報】AI規制法案が国会提出へ',
          content: '日本でもついにAI規制が本格化。クリエイティブ業界への影響は？企業は今から準備が必要です。',
          scheduledAt: new Date(new Date().setHours(9, 0)),
          status: 'scheduled',
          sourceData: {
            articleTitle: 'AI規制法案、今国会提出へ 企業に利用指針策定義務',
            engagement: { likes: 1250, retweets: 380, impressions: 45000 }
          },
          expectedEngagement: {
            score: 85,
            reasoning: 'AIと規制の話題は高エンゲージメント傾向'
          }
        },
        {
          id: '2',
          type: 'news_summary',
          title: '【今日の10大ニュース】' + format(new Date(), 'yyyy年M月d日'),
          content: '本日の重要ニュースをまとめました📰\n\n1. AI規制法案が国会提出\n2. OpenAI新モデル発表\n3. メタバース市場が急成長\n...',
          scheduledAt: new Date(new Date().setHours(18, 0)),
          status: 'draft',
          expectedEngagement: {
            score: 92,
            reasoning: 'まとめコンテンツは保存率が高い'
          }
        },
        {
          id: '3',
          type: 'buzz_comment',
          title: 'バズ投稿への反応',
          content: 'この視点は面白い！クリエイティブ×AIの可能性をもっと探求していきたいですね。',
          scheduledAt: new Date(new Date().setHours(14, 30)),
          status: 'scheduled',
          sourceData: {
            originalAuthor: '@example_user',
            engagement: { likes: 5000, retweets: 1200, impressions: 150000 }
          },
          expectedEngagement: {
            score: 72,
            reasoning: '人気投稿への早めの反応'
          }
        }
      ]
      setScheduledContent(mockData)
    } catch (error) {
      console.error('Failed to fetch scheduled content:', error)
    } finally {
      setLoading(false)
    }
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'ai_generated': return <TrendingUp className="w-4 h-4" />
      case 'news_comment': return <MessageSquare className="w-4 h-4" />
      case 'news_summary': return <ListOrdered className="w-4 h-4" />
      case 'buzz_comment': return <Zap className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getContentColor = (type: string) => {
    switch (type) {
      case 'ai_generated': return 'bg-blue-500'
      case 'news_comment': return 'bg-purple-500'
      case 'news_summary': return 'bg-green-500'
      case 'buzz_comment': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight">
              スケジューラー
            </h1>
            <p className="text-lg text-muted-foreground">
              投稿を計画的に管理し、最適なタイミングで配信
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新規投稿を作成
          </Button>
          <Button variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            ニュースにコメント
          </Button>
          <Button variant="outline">
            <Newspaper className="w-4 h-4 mr-2" />
            今日の10大ニュース
          </Button>
          <Button variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            バズ投稿に反応
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                本日の予定投稿
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                3件が投稿済み
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                今週の投稿数
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">
                先週比 +15%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                平均エンゲージメント
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.2%</div>
              <p className="text-xs text-muted-foreground">
                業界平均を上回る
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                最適投稿時間
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12:00</div>
              <p className="text-xs text-muted-foreground">
                次は18:00を推奨
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>投稿ルール設定</CardTitle>
              <CardDescription>
                自動投稿のルールを設定します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    最小投稿間隔（分）
                  </label>
                  <input
                    type="number"
                    value={rules.minInterval}
                    onChange={(e) => setRules({ ...rules, minInterval: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    1日の最大投稿数
                  </label>
                  <input
                    type="number"
                    value={rules.maxPerDay}
                    onChange={(e) => setRules({ ...rules, maxPerDay: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    投稿時間帯
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={rules.activeHours.start}
                      onChange={(e) => setRules({ 
                        ...rules, 
                        activeHours: { ...rules.activeHours, start: parseInt(e.target.value) }
                      })}
                      className="w-20 px-3 py-2 border rounded-lg"
                      min="0"
                      max="23"
                    />
                    <span className="text-muted-foreground">時 〜</span>
                    <input
                      type="number"
                      value={rules.activeHours.end}
                      onChange={(e) => setRules({ 
                        ...rules, 
                        activeHours: { ...rules.activeHours, end: parseInt(e.target.value) }
                      })}
                      className="w-20 px-3 py-2 border rounded-lg"
                      min="0"
                      max="24"
                    />
                    <span className="text-muted-foreground">時</span>
                  </div>
                </div>
                <Button className="w-full">
                  ルールを保存
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList>
            <TabsTrigger value="today">今日</TabsTrigger>
            <TabsTrigger value="week">今週</TabsTrigger>
            <TabsTrigger value="calendar">カレンダー</TabsTrigger>
            <TabsTrigger value="drafts">下書き</TabsTrigger>
            <TabsTrigger value="analytics">分析</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {scheduledContent.map((content) => (
                <Card key={content.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getContentColor(content.type)} text-white`}>
                          {getContentIcon(content.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{content.title}</CardTitle>
                          <CardDescription>
                            {format(content.scheduledAt, 'HH:mm', { locale: ja })} に投稿予定
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={content.status === 'scheduled' ? 'default' : 'secondary'}>
                        {content.status === 'draft' && '下書き'}
                        {content.status === 'scheduled' && '予約済み'}
                        {content.status === 'posted' && '投稿済み'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {content.content}
                    </p>
                    {content.sourceData && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {content.sourceData.engagement && (
                          <>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {content.sourceData.engagement.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <Share2 className="w-3 h-3" />
                              {content.sourceData.engagement.retweets}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {content.sourceData.engagement.impressions.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {content.expectedEngagement && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">期待エンゲージメント</span>
                          <Badge variant="outline">{content.expectedEngagement.score}点</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {content.expectedEngagement.reasoning}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">編集</Button>
                      <Button size="sm" variant="outline">プレビュー</Button>
                      {content.status === 'draft' && (
                        <Button size="sm">今すぐ投稿</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="week">
            <Card>
              <CardHeader>
                <CardTitle>今週の投稿スケジュール</CardTitle>
                <CardDescription>
                  週間の投稿計画を確認
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  週間ビューは開発中です
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <ScheduleCalendar />
          </TabsContent>

          <TabsContent value="drafts">
            <Card>
              <CardHeader>
                <CardTitle>下書き一覧</CardTitle>
                <CardDescription>
                  作成したコンテンツをスケジュールに追加
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  下書き管理機能は開発中です
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>投稿パフォーマンス分析</CardTitle>
                <CardDescription>
                  投稿タイプ別のエンゲージメント率
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  分析機能は開発中です
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}