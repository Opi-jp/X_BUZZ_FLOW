'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, FileText, MessageSquare, Images, Edit, Trash2, Send } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const formatIcons = {
  single: <FileText className="w-4 h-4" />,
  thread: <MessageSquare className="w-4 h-4" />,
  carousel: <Images className="w-4 h-4" />
}

export default function SchedulePage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  useEffect(() => {
    fetchScheduledDrafts()
    // 1分ごとに更新して最新の状態を表示
    const interval = setInterval(fetchScheduledDrafts, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchScheduledDrafts = async () => {
    try {
      const response = await fetch('/api/viral/v2/drafts?status=SCHEDULED')
      const data = await response.json()
      // 予定時刻順にソート
      const sorted = data.drafts.sort((a: any, b: any) => 
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
      setDrafts(sorted)
    } catch (error) {
      console.error('Error fetching scheduled drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePostNow = async (draftId: string) => {
    if (!confirm('今すぐ投稿しますか？スケジュールはキャンセルされます。')) {
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
          alert(`スレッド投稿が完了しました！\n${result.tweetIds.length}個のツイートを投稿しました。`)
        } else {
          alert('投稿が完了しました！')
        }
        window.open(result.tweetUrl, '_blank')
        await fetchScheduledDrafts()
      }
    } catch (error) {
      console.error('Error posting:', error)
      alert('投稿に失敗しました')
    } finally {
      setPosting(null)
    }
  }

  const handleCancelSchedule = async (draftId: string) => {
    if (!confirm('スケジュールをキャンセルしますか？')) {
      return
    }

    setCancelling(draftId)
    try {
      const response = await fetch(`/api/viral/v2/drafts/${draftId}/cancel-schedule`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel schedule')
      }
      
      alert('スケジュールをキャンセルしました')
      await fetchScheduledDrafts()
    } catch (error) {
      console.error('Error cancelling schedule:', error)
      alert('キャンセルに失敗しました')
    } finally {
      setCancelling(null)
    }
  }

  const getTimeUntilPost = (scheduledAt: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledAt)
    const diff = scheduled.getTime() - now.getTime()
    
    if (diff < 0) return '投稿予定時刻を過ぎています'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}日後`
    } else if (hours > 0) {
      return `${hours}時間${minutes}分後`
    } else {
      return `${minutes}分後`
    }
  }

  const getStatusBadge = (scheduledAt: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledAt)
    const diff = scheduled.getTime() - now.getTime()
    const minutes = diff / (1000 * 60)
    
    if (diff < 0) {
      return <Badge variant="destructive">投稿待機中</Badge>
    } else if (minutes <= 60) {
      return <Badge variant="default" className="bg-orange-500">まもなく投稿</Badge>
    } else {
      return <Badge variant="secondary">スケジュール済み</Badge>
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">スケジュール管理</h1>
        <p className="text-muted-foreground">
          予約投稿の一覧です。投稿時刻の変更や即座投稿が可能です
        </p>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">スケジュール済みの投稿はありません</p>
            <Button onClick={() => router.push('/viral/v2/create')}>
              新しいコンテンツを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => {
            const session = draft.session
            const content = session?.contents?.find((c: any) => c.conceptId === draft.conceptId)
            const format = content?.concept?.format || 'single'
            
            return (
              <Card key={draft.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(draft.scheduledAt)}
                        <Badge variant="outline">
                          {formatIcons[format as keyof typeof formatIcons]}
                          <span className="ml-1">{format}</span>
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{draft.title}</CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(draft.scheduledAt), 'M月d日(E)', { locale: ja })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(draft.scheduledAt), 'HH:mm')}
                          </div>
                          <div className="font-medium text-foreground">
                            {getTimeUntilPost(draft.scheduledAt)}
                          </div>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
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
                        onClick={() => handleCancelSchedule(draft.id)}
                        disabled={cancelling === draft.id}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {cancelling === draft.id ? 'キャンセル中...' : 'キャンセル'}
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
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="whitespace-pre-wrap line-clamp-3">{draft.content}</p>
                  </div>
                  {draft.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {draft.hashtags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={() => router.push('/viral/v2/drafts')}>
          下書き一覧へ
        </Button>
        <Button onClick={() => router.push('/viral/v2/create')}>
          新しいコンテンツを作成
        </Button>
      </div>
    </div>
  )
}