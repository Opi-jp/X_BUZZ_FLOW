'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Newspaper, 
  TrendingUp, 
  BarChart3, 
  RefreshCw,
  ExternalLink,
  Clock,
  Globe,
  Hash,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface NewsItem {
  id: string
  title: string
  source: string
  url: string
  publishedAt: string
  category: string
}

interface BuzzPost {
  id: string
  content: string
  author: string
  likes: number
  retweets: number
  impressions: number
  createdAt: string
}

export function IntelligencePanel() {
  const [activeTab, setActiveTab] = useState('news')
  const [loading, setLoading] = useState(false)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [buzzPosts, setBuzzPosts] = useState<BuzzPost[]>([])
  const [collectingNews, setCollectingNews] = useState(false)

  useEffect(() => {
    fetchLatestData()
  }, [activeTab])

  const fetchLatestData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'news') {
        // 最新ニュースを取得
        const response = await fetch('/api/news/latest?limit=5')
        const data = await response.json()
        setNewsItems(data.items || [])
      } else if (activeTab === 'buzz') {
        // バズ投稿を取得
        const response = await fetch('/api/buzz/trending?limit=5')
        const data = await response.json()
        setBuzzPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCollectNews = async () => {
    setCollectingNews(true)
    try {
      const response = await fetch('/api/news/collect', { method: 'POST' })
      if (response.ok) {
        await fetchLatestData()
      }
    } catch (error) {
      console.error('Failed to collect news:', error)
    } finally {
      setCollectingNews(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Intelligence - 情報収集・分析</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCollectNews}
            disabled={collectingNews}
          >
            {collectingNews ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                収集中...
              </>
            ) : (
              <>
                <Newspaper className="w-4 h-4 mr-2" />
                ニュース収集
              </>
            )}
          </Button>
          <Link href="/viral/v2/data-explorer">
            <Button variant="default" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              データエクスプローラー
            </Button>
          </Link>
        </div>
      </div>

      {/* Intelligence Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="news">
            <Newspaper className="w-4 h-4 mr-2" />
            ニュース
          </TabsTrigger>
          <TabsTrigger value="buzz">
            <TrendingUp className="w-4 h-4 mr-2" />
            バズ投稿
          </TabsTrigger>
          <TabsTrigger value="trends">
            <Hash className="w-4 h-4 mr-2" />
            トレンド
          </TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">読み込み中...</p>
            </div>
          ) : newsItems.length > 0 ? (
            <div className="space-y-3">
              {newsItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-base line-clamp-2">
                          {item.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Globe className="w-3 h-3" />
                          <span>{item.source}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{new Date(item.publishedAt).toLocaleString('ja-JP')}</span>
                        </div>
                      </div>
                      <Link href={item.url} target="_blank">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{item.category}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Newspaper className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">まだニュースがありません</p>
                <Button 
                  className="mt-4" 
                  size="sm"
                  onClick={handleCollectNews}
                >
                  ニュースを収集
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="buzz" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">読み込み中...</p>
            </div>
          ) : buzzPosts.length > 0 ? (
            <div className="space-y-3">
              {buzzPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium">@{post.author}</p>
                        <p className="text-sm line-clamp-3">{post.content}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>❤️ {post.likes.toLocaleString()}</span>
                      <span>🔄 {post.retweets.toLocaleString()}</span>
                      <span>👁 {post.impressions.toLocaleString()}</span>
                      <span className="ml-auto text-xs">
                        {new Date(post.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">バズ投稿を取得していません</p>
                <Link href="/buzz">
                  <Button className="mt-4" size="sm">
                    バズ分析を開始
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>トレンド分析</CardTitle>
              <CardDescription>
                現在のトレンドトピックと関連キーワード
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-600">#1</Badge>
                    <span className="font-medium">AIと働き方改革</span>
                  </div>
                  <span className="text-sm text-gray-600">15.2K posts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">#2</Badge>
                    <span className="font-medium">生成AI活用術</span>
                  </div>
                  <span className="text-sm text-gray-600">12.8K posts</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">#3</Badge>
                    <span className="font-medium">リモートワーク</span>
                  </div>
                  <span className="text-sm text-gray-600">9.5K posts</span>
                </div>
              </div>
              <Link href="/viral/v2/data-explorer">
                <Button className="w-full" variant="outline">
                  詳細なトレンド分析を見る
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Intelligence Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            インテリジェンスサマリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">
            現在、<span className="font-semibold">AI・働き方改革</span>に関するトピックが
            特に注目を集めています。過去24時間で<span className="font-semibold">35%</span>の
            エンゲージメント増加が見られます。
          </p>
          <div className="flex items-center gap-2">
            <Link href="/viral/v2/sessions/create?theme=AIと働き方">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                このテーマでコンテンツを生成
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}