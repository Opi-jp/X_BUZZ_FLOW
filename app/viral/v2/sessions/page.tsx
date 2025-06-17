'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronRight, Loader2 } from 'lucide-react'

export default function SessionsListPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/viral/v2/sessions')
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CREATED: { label: '作成済み', variant: 'outline' as const },
      TOPICS_COLLECTED: { label: 'トピック収集済み', variant: 'secondary' as const },
      CONCEPTS_GENERATED: { label: 'コンセプト生成済み', variant: 'default' as const },
      COMPLETED: { label: '完了', variant: 'success' as const },
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const }
    
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getNextStep = (session: any) => {
    switch (session.status) {
      case 'CREATED':
        return `/viral/v2/sessions/${session.id}/topics`
      case 'TOPICS_COLLECTED':
        return `/viral/v2/sessions/${session.id}/concepts`
      case 'CONCEPTS_GENERATED':
        return `/viral/v2/sessions/${session.id}/results`
      case 'CONTENTS_GENERATED':
        return `/viral/v2/sessions/${session.id}/character-contents`
      case 'COMPLETED':
        return `/viral/v2/sessions/${session.id}/results`
      default:
        return `/viral/v2/sessions/${session.id}/topics`
    }
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">セッション一覧</h1>
          <p className="text-muted-foreground">
            作成したバイラルコンテンツセッションの管理
          </p>
        </div>
        <Button onClick={() => router.push('/viral/v2/create')}>
          新しいセッションを作成
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              まだセッションがありません
            </p>
            <Button onClick={() => router.push('/viral/v2/create')}>
              最初のセッションを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{session.theme}</CardTitle>
                    <CardDescription>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(session.createdAt).toLocaleString('ja-JP')}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(session.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(getNextStep(session))}
                    >
                      続行 <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>プラットフォーム: {session.platform}</span>
                  <span>スタイル: {session.style}</span>
                  {session._count?.drafts > 0 && (
                    <span>下書き: {session._count.drafts}件</span>
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