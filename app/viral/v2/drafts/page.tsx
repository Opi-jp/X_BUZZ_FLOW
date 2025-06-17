'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Edit, Send, Clock, CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'

export default function DraftsListPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/viral/v2/drafts')
      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostNow = async (draftId: string) => {
    if (!session) {
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
        throw new Error('Failed to post')
      }
      
      alert('投稿が完了しました！')
      await fetchDrafts()
    } catch (error) {
      console.error('Error posting:', error)
      alert('投稿に失敗しました')
    } finally {
      setPosting(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { label: '下書き', variant: 'outline' as const, icon: <Edit className="w-3 h-3" /> },
      SCHEDULED: { label: 'スケジュール済み', variant: 'secondary' as const, icon: <Clock className="w-3 h-3" /> },
      POSTED: { label: '投稿済み', variant: 'default' as const, icon: <CheckCircle className="w-3 h-3" /> },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      variant: 'outline' as const,
      icon: null 
    }
    
    return (
      <Badge variant={config.variant}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">下書き一覧</h1>
          <p className="text-muted-foreground">
            生成されたコンテンツの管理と投稿
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push('/viral/v2/schedule')}
          >
            <Clock className="w-4 h-4 mr-1" />
            スケジュール管理
          </Button>
          <Button onClick={() => router.push('/viral/v2/create')}>
            新しいコンテンツを作成
          </Button>
        </div>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              まだ下書きがありません
            </p>
            <Button onClick={() => router.push('/viral/v2/create')}>
              新しいコンテンツを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{draft.title}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(draft.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(draft.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {draft.content}
                  </p>
                </div>
                
                {draft.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {draft.hashtags.slice(0, 5).map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </Badge>
                    ))}
                    {draft.hashtags.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{draft.hashtags.length - 5}
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  {draft.status === 'DRAFT' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/viral/v2/drafts/${draft.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/viral/v2/drafts/${draft.id}/schedule`)}
                      >
                        <Clock className="w-4 h-4 mr-1" />
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
                    </>
                  )}
                  {draft.status === 'SCHEDULED' && draft.scheduledAt && (
                    <div className="text-sm text-muted-foreground">
                      投稿予定: {new Date(draft.scheduledAt).toLocaleString('ja-JP')}
                    </div>
                  )}
                  {draft.status === 'POSTED' && draft.tweetId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://twitter.com/i/web/status/${draft.tweetId}`, '_blank')}
                    >
                      投稿を見る
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}