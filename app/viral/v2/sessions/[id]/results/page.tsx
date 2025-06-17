'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, MessageSquare, Images, Hash, Image, Calendar, Send, ChevronLeft } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

const formatIcons = {
  single: <FileText className="w-4 h-4" />,
  thread: <MessageSquare className="w-4 h-4" />,
  carousel: <Images className="w-4 h-4" />
}

export default function ResultsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: authSession } = useSession()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState<string | null>(null)

  useEffect(() => {
    fetchSession()
  }, [id])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/viral/v2/sessions/${id}`)
      const data = await response.json()
      setSession(data.session)
    } catch (error) {
      console.error('Error fetching session:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostNow = async (draftId: string) => {
    if (!authSession) {
      alert('Twitterにログインしてください')
      router.push('/auth/signin')
      return
    }

    setPosting(draftId)
    try {
      const response = await fetch(`/api/viral/v2/drafts/${draftId}/post-now`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to post')
      }
      
      const result = await response.json()
      
      if (result.success) {
        if (result.isThread) {
          alert(`スレッド投稿が完了しました！\n${result.tweetIds.length}個のツイートを投稿しました。\n\n${result.tweetUrl}`)
        } else {
          alert(`投稿が完了しました！\n\n${result.tweetUrl}`)
        }
        // 新しいタブで投稿を開く
        window.open(result.tweetUrl, '_blank')
      }
      
      await fetchSession()
    } catch (error) {
      console.error('Error posting:', error)
      alert('投稿に失敗しました')
    } finally {
      setPosting(null)
    }
  }

  const handleSchedule = (draftId: string) => {
    router.push(`/viral/v2/drafts/${draftId}/schedule`)
  }

  const handleEdit = (draftId: string) => {
    router.push(`/viral/v2/drafts/${draftId}/edit`)
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  const drafts = session?.drafts || []

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/viral/v2/sessions/${id}/concepts`)}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Step 2に戻る
        </Button>
        <h1 className="text-3xl font-bold mb-2">Step 3: 生成されたコンテンツ</h1>
        <p className="text-muted-foreground">
          {drafts.length}個のコンテンツが生成されました。編集、即座投稿、またはスケジュール設定が可能です
        </p>
      </div>

      <Tabs defaultValue={drafts[0]?.id} className="space-y-4">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(drafts.length, 5)}, 1fr)` }}>
          {drafts.map((draft: any, index: number) => (
            <TabsTrigger key={draft.id} value={draft.id}>
              下書き {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {drafts.map((draft: any) => (
          <TabsContent key={draft.id} value={draft.id}>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{draft.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {(() => {
                          // セッションのcontentsから正しいフォーマットを取得
                          const content = session?.contents?.find((c: any) => c.conceptId === draft.conceptId)
                          const format = content?.concept?.format || 'single'
                          return (
                            <>
                              {formatIcons[format as keyof typeof formatIcons]}
                              <span className="ml-1">{format}</span>
                            </>
                          )
                        })()}
                      </Badge>
                      <Badge variant="secondary">
                        <Hash className="w-3 h-3 mr-1" />
                        {draft.hashtags.length} hashtags
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(draft.id)}>
                      編集
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSchedule(draft.id)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      スケジュール
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePostNow(draft.id)}
                      disabled={posting === draft.id}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {posting === draft.id ? '投稿中...' : '今すぐ投稿'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">コンテンツ</h4>
                    <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                      {draft.content}
                    </div>
                  </div>
                  
                  {draft.hashtags.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">ハッシュタグ</h4>
                      <div className="flex flex-wrap gap-2">
                        {draft.hashtags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary">
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {draft.visualNote && (
                    <div>
                      <h4 className="font-semibold mb-2">
                        <Image className="inline-block w-4 h-4 mr-1" />
                        ビジュアルノート
                      </h4>
                      <p className="text-sm text-muted-foreground">{draft.visualNote}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={() => router.push('/viral/v2/drafts')}>
          下書き一覧へ
        </Button>
        <Button onClick={() => router.push('/viral/v2/create')}>
          新しいセッションを開始
        </Button>
      </div>
    </div>
  )
}