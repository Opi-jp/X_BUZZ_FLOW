'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Heart, MessageCircle, BarChart3, Share2, Clock, TrendingUp, Eye } from 'lucide-react'
import Link from 'next/link'

interface PostMetrics {
  likes: number
  retweets: number
  replies: number
  impressions: number
  engagementRate: number
}

interface Post {
  id: string
  content: string
  createdAt: string
  status: 'published' | 'scheduled' | 'draft'
  metrics?: PostMetrics
  performanceScore?: number
  tags: string[]
}

export default function BuzzPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('published')

  useEffect(() => {
    fetchPosts()
  }, [activeTab])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/buzz/posts?status=${activeTab}`)
      // const data = await response.json()
      
      // Mock data for now
      const mockPosts: Post[] = [
        {
          id: '1',
          content: '🚀 AIエージェントが変える未来の働き方！\n\n私たちの仕事の80%が自動化される時代、あなたはどう生き残りますか？\n\n#AI革命 #未来の働き方 #LLM活用',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'published',
          metrics: {
            likes: 156,
            retweets: 42,
            replies: 23,
            impressions: 5234,
            engagementRate: 4.2
          },
          performanceScore: 85,
          tags: ['AI', '働き方', 'トレンド']
        },
        {
          id: '2',
          content: '💡 クリエイティブ × AI = 無限の可能性\n\n23年のクリエイティブ経験から学んだこと：\nAIは敵じゃない、最強の相棒だ\n\n#クリエイティブ #AIツール',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'published',
          metrics: {
            likes: 89,
            retweets: 15,
            replies: 12,
            impressions: 2341,
            engagementRate: 3.8
          },
          performanceScore: 72,
          tags: ['クリエイティブ', 'AI活用']
        },
        {
          id: '3',
          content: '🎯 50歳からのセカンドキャリア戦略\n\nLLM時代を生き抜く3つのスキル：\n1. AI活用力\n2. 人間力\n3. 発信力\n\n#キャリア #AI時代',
          createdAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          tags: ['キャリア', 'AI時代', '戦略']
        }
      ]

      setPosts(mockPosts.filter(post => 
        activeTab === 'all' || post.status === activeTab
      ))
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}分前`
    } else if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}時間前`
    } else {
      return date.toLocaleDateString('ja-JP')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">公開済み</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-500">予約投稿</Badge>
      case 'draft':
        return <Badge variant="secondary">下書き</Badge>
      default:
        return null
    }
  }

  const getPerformanceColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">バズ投稿管理</h2>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/viral/gpt">新規作成</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/viral/drafts">下書き一覧</Link>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="published">公開済み</TabsTrigger>
            <TabsTrigger value="scheduled">予約投稿</TabsTrigger>
            <TabsTrigger value="draft">下書き</TabsTrigger>
            <TabsTrigger value="all">すべて</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading ? (
              <div className="text-center py-8">読み込み中...</div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">投稿がありません</p>
                  <Button className="mt-4" asChild>
                    <Link href="/viral/gpt">最初の投稿を作成</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              <div className="flex items-center gap-2">
                                {getStatusBadge(post.status)}
                                <span className="text-sm text-muted-foreground">
                                  {post.status === 'scheduled' ? '予約: ' : ''}
                                  {formatDate(post.createdAt)}
                                </span>
                              </div>
                            </CardTitle>
                          </div>
                          {post.performanceScore && (
                            <div className={`flex items-center gap-1 ${getPerformanceColor(post.performanceScore)}`}>
                              <TrendingUp className="h-4 w-4" />
                              <span className="font-semibold">{post.performanceScore}</span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="whitespace-pre-wrap">{post.content}</p>
                        
                        {post.metrics && (
                          <div className="grid grid-cols-5 gap-4 pt-4 border-t">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Heart className="h-4 w-4 text-red-500" />
                                <span className="font-semibold">{post.metrics.likes}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">いいね</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Share2 className="h-4 w-4 text-green-500" />
                                <span className="font-semibold">{post.metrics.retweets}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">リツイート</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <MessageCircle className="h-4 w-4 text-blue-500" />
                                <span className="font-semibold">{post.metrics.replies}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">返信</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Eye className="h-4 w-4 text-purple-500" />
                                <span className="font-semibold">{post.metrics.impressions.toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">表示</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <BarChart3 className="h-4 w-4 text-orange-500" />
                                <span className="font-semibold">{post.metrics.engagementRate}%</span>
                              </div>
                              <p className="text-xs text-muted-foreground">エンゲージメント</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-1">
                            {post.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              詳細を見る
                            </Button>
                            {post.status === 'published' && (
                              <Button size="sm" variant="outline">
                                分析
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}