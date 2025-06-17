'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Calendar, TrendingUp, ChevronLeft } from 'lucide-react'
import { useViralSession } from '@/hooks/useViralSession'
import { SessionStatus } from '@/types/viral-v2'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

// URLからドメイン名を抽出
const extractDomain = (url: string) => {
  try {
    const domain = new URL(url).hostname
    return domain.replace('www.', '')
  } catch {
    return url
  }
}

// 追加ソースから記事タイトルを取得
const getSourceTitle = (url: string, additionalSources: any[]) => {
  const source = additionalSources?.find(s => s.url === url)
  return source?.title
}

export default function TopicsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [collecting, setCollecting] = useState(false)
  
  const { session, loading, error, refetch } = useViralSession(id, {
    autoRedirectOnError: true,
    autoCollectTopics: true
  })

  useEffect(() => {
    // Auto-collect if session is in CREATED state
    if (session?.status === SessionStatus.CREATED && !collecting) {
      handleCollectTopics()
    }
  }, [session?.status])

  const handleCollectTopics = async () => {
    setCollecting(true)
    try {
      const response = await fetch(`/api/viral/v2/sessions/${id}/collect-topics`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to collect topics')
      }
      
      await refetch()
    } catch (error) {
      console.error('Error collecting topics:', error)
      alert('トピックの収集に失敗しました')
    } finally {
      setCollecting(false)
    }
  }

  const handleContinue = () => {
    router.push(`/viral/v2/sessions/${id}/concepts`)
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }
  
  if (error || !session) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-6">
            <p className="text-red-700">
              {error || 'セッションが見つかりません'}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/viral/v2/sessions')}
              className="mt-4"
            >
              セッション一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const topics = session?.topics?.parsed || []

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/viral/v2/sessions')}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          セッション一覧に戻る
        </Button>
        <h1 className="text-3xl font-bold mb-2">Step 1: トレンドトピック収集</h1>
        <p className="text-muted-foreground">
          Perplexity AIが最新のトレンドを分析し、バズる可能性の高いトピックを特定しました
        </p>
      </div>

      {collecting && (
        <Card className="mb-8">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>最新のトレンドを分析中...</p>
              <p className="text-sm text-muted-foreground mt-2">
                約30秒かかります
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {topics.length > 0 && (
        <>
          <div className="space-y-6 mb-8">
            {topics.map((topic: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        <TrendingUp className="inline-block w-5 h-5 mr-2 text-primary" />
                        {topic.TOPIC}
                      </CardTitle>
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {topic.date}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">出典: </span>
                          <a 
                            href={topic.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {(() => {
                              const source = session?.topics?.sources?.find((s: any) => s.url === topic.url)
                              if (source?.title) {
                                return (
                                  <span className="inline-flex items-center gap-1">
                                    <span>{source.title}</span>
                                    <span className="text-muted-foreground text-xs">({extractDomain(topic.url)})</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </span>
                                )
                              }
                              return (
                                <span className="inline-flex items-center gap-1">
                                  {extractDomain(topic.url)}
                                  <ExternalLink className="w-3 h-3" />
                                </span>
                              )
                            })()}
                          </a>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">Topic {index + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">記事要約</h4>
                      <p className="text-sm text-muted-foreground">{topic.summary}</p>
                    </div>
                    
                    {topic.keyPoints && topic.keyPoints.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">重要ポイント</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {topic.keyPoints.map((point: string, i: number) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold mb-2">バイラル分析</h4>
                      <p className="text-sm">{topic.perplexityAnalysis}</p>
                    </div>
                    
                    {topic.additionalSources && topic.additionalSources.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">関連記事</h4>
                        <div className="space-y-2">
                          {topic.additionalSources.map((source: any, i: number) => (
                            <div key={i} className="border-l-2 border-muted pl-3 py-1">
                              <a 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm hover:text-primary block"
                              >
                                <div className="font-medium line-clamp-2">
                                  {source.title || 'タイトル不明'}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                  <span>{extractDomain(source.url)}</span>
                                  {source.date && (
                                    <>
                                      <span>•</span>
                                      <span>{source.date}</span>
                                    </>
                                  )}
                                  <ExternalLink className="w-3 h-3 ml-auto" />
                                </div>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{topics.length}個のトピックを発見</p>
                  <p className="text-sm text-muted-foreground">
                    次のステップで各トピックから3つのコンセプトを生成します
                  </p>
                </div>
                <Button onClick={handleContinue}>
                  コンセプト生成へ進む
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}