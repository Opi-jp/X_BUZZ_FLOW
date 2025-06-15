'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, MessageSquare, Zap, BarChart3, Clock, Heart, Repeat2, Share2 } from 'lucide-react';
import Link from 'next/link';

interface BuzzPost {
  id: string;
  content: string;
  author: string;
  authorHandle: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  trending: boolean;
  category: string;
}

export default function BuzzPage() {
  const [posts, setPosts] = useState<BuzzPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trending');

  useEffect(() => {
    // TODO: Fetch buzz posts from API
    // For now, using mock data
    setPosts([
      {
        id: '1',
        content: 'OpenAIの新しいモデルGPT-5が2025年Q3にリリース予定との噂。AGI（汎用人工知能）への大きな一歩になるか注目が集まっています。#AI #GPT5 #AGI',
        author: 'AI News Daily',
        authorHandle: '@ainewsdaily',
        timestamp: '2025-06-15T10:30:00Z',
        likes: 15420,
        retweets: 3211,
        replies: 892,
        impressions: 125000,
        trending: true,
        category: 'AI'
      },
      {
        id: '2',
        content: 'リモートワークの生産性について新しい研究結果が発表。適切な環境設定により、オフィス勤務と比較して平均13%の生産性向上が確認されました。',
        author: 'Future of Work',
        authorHandle: '@futureofwork',
        timestamp: '2025-06-15T09:15:00Z',
        likes: 8932,
        retweets: 1876,
        replies: 423,
        impressions: 89000,
        trending: true,
        category: '働き方'
      },
      {
        id: '3',
        content: 'AIエージェントが複雑なタスクを自律的に実行できるようになってきた。プログラミング、デザイン、文書作成など、クリエイティブな領域でも活躍が期待される。',
        author: 'Tech Innovator',
        authorHandle: '@techinnovator',
        timestamp: '2025-06-15T08:00:00Z',
        likes: 5421,
        retweets: 1102,
        replies: 234,
        impressions: 56000,
        trending: false,
        category: 'AI'
      }
    ]);
    setLoading(false);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return '1時間以内';
    if (hours < 24) return `${hours}時間前`;
    return date.toLocaleDateString('ja-JP');
  };

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            バズ分析
          </h1>
          <p className="text-muted-foreground">トレンドの投稿を分析して、バイラルコンテンツを作成</p>
        </div>
        <div className="flex gap-2">
          <Link href="/buzz/config">
            <Button variant="outline">設定</Button>
          </Link>
          <Link href="/buzz/quote">
            <Button>
              <MessageSquare className="h-4 w-4 mr-2" />
              引用投稿作成
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日のバズ投稿</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+15% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均エンゲージメント</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.5K</div>
            <p className="text-xs text-muted-foreground">いいね + RT + 返信</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">トレンドカテゴリ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AI</div>
            <p className="text-xs text-muted-foreground">最も話題のトピック</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">分析済み投稿</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">過去24時間</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trending">
            <TrendingUp className="h-4 w-4 mr-2" />
            トレンド
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="h-4 w-4 mr-2" />
            最新
          </TabsTrigger>
          <TabsTrigger value="analyzed">
            <BarChart3 className="h-4 w-4 mr-2" />
            分析済み
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                読み込み中...
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                投稿が見つかりません
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                      <div>
                        <CardTitle className="text-base">{post.author}</CardTitle>
                        <CardDescription>{post.authorHandle} • {formatTimestamp(post.timestamp)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.trending && (
                        <Badge variant="destructive">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          トレンド
                        </Badge>
                      )}
                      <Badge variant="outline">{post.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4 whitespace-pre-wrap">{post.content}</p>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {formatNumber(post.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat2 className="h-4 w-4" />
                        {formatNumber(post.retweets)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {formatNumber(post.replies)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        {formatNumber(post.impressions)}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      引用する
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}