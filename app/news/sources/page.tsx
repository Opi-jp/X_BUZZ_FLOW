'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: string;
  language: string;
  enabled: boolean;
  lastFetched?: string;
  articleCount?: number;
}

export default function NewsSourcesPage() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    // TODO: Fetch news sources from API
    // For now, using mock data
    setSources([
      {
        id: '1',
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'Technology',
        language: 'en',
        enabled: true,
        lastFetched: '2025-06-15T08:00:00Z',
        articleCount: 45
      },
      {
        id: '2',
        name: 'Hacker News',
        url: 'https://news.ycombinator.com/rss',
        category: 'Technology',
        language: 'en',
        enabled: true,
        lastFetched: '2025-06-15T07:30:00Z',
        articleCount: 30
      },
      {
        id: '3',
        name: 'AI News',
        url: 'https://www.artificialintelligence-news.com/feed/',
        category: 'AI',
        language: 'en',
        enabled: false,
        lastFetched: '2025-06-14T12:00:00Z',
        articleCount: 15
      }
    ]);
    setLoading(false);
  }, []);

  const handleToggleSource = (id: string) => {
    setSources(sources.map(source => 
      source.id === id ? { ...source, enabled: !source.enabled } : source
    ));
  };

  const handleDeleteSource = (id: string) => {
    if (confirm('このニュースソースを削除してもよろしいですか？')) {
      setSources(sources.filter(source => source.id !== id));
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/news">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">ニュースソース管理</h1>
            <p className="text-muted-foreground">RSS/APIフィードの管理と設定</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規ソース追加
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              読み込み中...
            </CardContent>
          </Card>
        ) : sources.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              ニュースソースが登録されていません
            </CardContent>
          </Card>
        ) : (
          sources.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {source.name}
                      <Badge variant={source.enabled ? 'default' : 'secondary'}>
                        {source.enabled ? '有効' : '無効'}
                      </Badge>
                      <Badge variant="outline">{source.category}</Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline"
                      >
                        {source.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.enabled}
                      onCheckedChange={() => handleToggleSource(source.id)}
                    />
                    <Button variant="ghost" size="icon">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteSource(source.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">言語:</span>{' '}
                    <span className="font-medium">{source.language.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">記事数:</span>{' '}
                    <span className="font-medium">{source.articleCount || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">最終取得:</span>{' '}
                    <span className="font-medium">
                      {source.lastFetched 
                        ? new Date(source.lastFetched).toLocaleString('ja-JP')
                        : '未取得'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>新規ニュースソース追加</CardTitle>
              <CardDescription>RSS/APIフィードのURLを入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ソース名</Label>
                <Input id="name" placeholder="例: TechCrunch Japan" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">フィードURL</Label>
                <Input id="url" placeholder="https://example.com/feed/" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">カテゴリー</Label>
                <Input id="category" placeholder="例: Technology, AI, Business" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  キャンセル
                </Button>
                <Button onClick={() => setShowAddForm(false)}>
                  追加
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}