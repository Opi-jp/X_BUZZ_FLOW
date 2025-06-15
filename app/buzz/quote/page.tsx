'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Sparkles, Copy, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface QuoteSuggestion {
  id: string;
  content: string;
  style: string;
  engagement: string;
}

export default function BuzzQuotePage() {
  const [originalPost, setOriginalPost] = useState('');
  const [quoteSuggestions, setQuoteSuggestions] = useState<QuoteSuggestion[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [customQuote, setCustomQuote] = useState('');

  const handleGenerateQuotes = async () => {
    if (!originalPost.trim()) return;

    setLoading(true);
    // TODO: Call API to generate quote suggestions
    // For now, using mock data
    setTimeout(() => {
      setQuoteSuggestions([
        {
          id: '1',
          content: 'これは興味深い視点ですね。特にAIの進化が働き方に与える影響について、私たちクリエイターも真剣に考える必要があります。\n\n従来の「会社で働く」という概念が根本から変わりつつある今、どう適応していくかが鍵になりそうです。',
          style: '洞察的',
          engagement: '高'
        },
        {
          id: '2',
          content: 'まさにこれ！🎯\n\nAI時代のクリエイターとして感じるのは、「創造性」の定義自体が変わってきているということ。\n\nAIを道具として使いこなせるかどうかが、これからの差別化要因になりそう。',
          style: 'カジュアル',
          engagement: '中'
        },
        {
          id: '3',
          content: '【AIと共創する時代へ】\n\n✅ 従来：人間 vs AI\n✅ これから：人間 with AI\n\nクリエイティブの現場でも、AIを敵視するのではなく、最強のパートナーとして活用する視点が重要。\n\n23年の経験から言えるのは、技術は常に進化するが、「人間らしさ」の価値は変わらないということ。',
          style: '教育的',
          engagement: '高'
        }
      ]);
      setLoading(false);
    }, 2000);
  };

  const handleCopyQuote = (content: string) => {
    navigator.clipboard.writeText(content);
    // TODO: Show toast notification
  };

  const handlePostQuote = async () => {
    const quoteToPost = customQuote || selectedQuote;
    if (!quoteToPost) return;

    // TODO: Call API to post the quote
    console.log('Posting quote:', quoteToPost);
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/buzz">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            引用投稿作成
          </h1>
          <p className="text-muted-foreground">バズ投稿に対する効果的な引用RTを作成</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>元の投稿</CardTitle>
            <CardDescription>引用したい投稿の内容を貼り付けてください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="original">投稿内容</Label>
              <Textarea
                id="original"
                placeholder="引用したい投稿をここに貼り付けてください..."
                className="min-h-[120px]"
                value={originalPost}
                onChange={(e) => setOriginalPost(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleGenerateQuotes}
              disabled={!originalPost.trim() || loading}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? 'AI分析中...' : '引用案を生成'}
            </Button>
          </CardContent>
        </Card>

        {quoteSuggestions.length > 0 && (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">AI生成の引用案</h2>
              {quoteSuggestions.map((suggestion) => (
                <Card 
                  key={suggestion.id}
                  className={`cursor-pointer transition-all ${
                    selectedQuote === suggestion.content 
                      ? 'ring-2 ring-primary' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedQuote(suggestion.content)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{suggestion.style}</Badge>
                        <Badge variant={suggestion.engagement === '高' ? 'default' : 'secondary'}>
                          エンゲージメント: {suggestion.engagement}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyQuote(suggestion.content);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{suggestion.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>カスタム引用</CardTitle>
                <CardDescription>AIの提案を参考に、自分でカスタマイズすることもできます</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="独自の引用文を作成..."
                  className="min-h-[120px]"
                  value={customQuote}
                  onChange={(e) => setCustomQuote(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    文字数: {customQuote.length}/280
                  </p>
                  <Button 
                    onClick={handlePostQuote}
                    disabled={!customQuote && !selectedQuote}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    投稿する
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}