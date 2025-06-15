'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Edit, 
  Trash2, 
  Send, 
  Clock, 
  FileText, 
  Loader2,
  Calendar,
  Hash,
  Eye
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface CotDraft {
  id: string
  sessionId: string
  conceptNumber: number
  title: string
  hook: string
  angle: string
  format: string
  content: string | null
  editedContent: string | null
  hashtags: string[]
  timing: string
  status: string
  scheduledAt: string | null
  postedAt: string | null
  createdAt: string
  updatedAt: string
  session: {
    expertise: string
    platform: string
    style: string
  }
}

export default function CotDraftsPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<CotDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/viral/cot-draft')
      if (!response.ok) throw new Error('Failed to fetch drafts')
      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (draftId: string) => {
    if (!confirm('この下書きを削除してもよろしいですか？')) return

    setDeletingId(draftId)
    try {
      const response = await fetch(`/api/viral/cot-draft/${draftId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete draft')
      
      // 削除後、リストを更新
      setDrafts(drafts.filter(draft => draft.id !== draftId))
    } catch (error) {
      console.error('Error deleting draft:', error)
      alert('削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { label: '下書き', variant: 'secondary' as const },
      EDITED: { label: '編集済み', variant: 'default' as const },
      SCHEDULED: { label: '予約済み', variant: 'outline' as const },
      POSTED: { label: '投稿済み', variant: 'success' as const },
      ARCHIVED: { label: 'アーカイブ', variant: 'secondary' as const }
    }
    
    const config = statusConfig[status] || statusConfig.DRAFT
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'thread':
        return <FileText className="w-4 h-4" />
      case 'single':
        return <Send className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  // セッションIDでグループ化
  const draftsBySession = drafts.reduce((acc, draft) => {
    if (!acc[draft.sessionId]) {
      acc[draft.sessionId] = []
    }
    acc[draft.sessionId].push(draft)
    return acc
  }, {} as Record<string, CotDraft[]>)

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">下書き管理</h1>
          <p className="mt-2 text-gray-600">
            Chain of Thoughtで生成されたコンテンツの下書きを管理します
          </p>
        </div>

        {Object.keys(draftsBySession).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">まだ下書きがありません</p>
            <Button 
              className="mt-4"
              onClick={() => router.push('/viral/cot')}
            >
              新しいコンテンツを生成
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(draftsBySession).map(([sessionId, sessionDrafts]) => (
              <div key={sessionId}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {sessionDrafts[0]?.session.expertise} - {sessionDrafts[0]?.session.platform}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {format(new Date(sessionDrafts[0].createdAt), 'PPpp', { locale: ja })}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sessionDrafts.map((draft) => (
                    <Card key={draft.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2">
                              {draft.title}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              <div className="flex items-center gap-2">
                                {getFormatIcon(draft.format)}
                                <span className="text-sm">{draft.format}</span>
                                {getStatusBadge(draft.status)}
                              </div>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* フック */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">フック</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{draft.hook}</p>
                          </div>

                          {/* 角度 */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">角度</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{draft.angle}</p>
                          </div>

                          {/* コンテンツプレビュー */}
                          {(draft.editedContent || draft.content) && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">プレビュー</p>
                              <p className="text-sm text-gray-600 line-clamp-3">
                                {draft.editedContent || draft.content}
                              </p>
                            </div>
                          )}

                          {/* ハッシュタグ */}
                          {draft.hashtags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              <Hash className="w-3 h-3 text-gray-400" />
                              {draft.hashtags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="text-xs text-blue-600">
                                  #{tag}
                                </span>
                              ))}
                              {draft.hashtags.length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{draft.hashtags.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 投稿タイミング */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {draft.timing}
                          </div>

                          {/* スケジュール済み */}
                          {draft.scheduledAt && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(draft.scheduledAt), 'PPp', { locale: ja })}
                            </div>
                          )}
                        </div>

                        {/* アクションボタン */}
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => router.push(`/viral/cot/drafts/${draft.id}`)}
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            編集
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/viral/cot/result-v2/${draft.sessionId}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(draft.id)}
                            disabled={deletingId === draft.id}
                          >
                            {deletingId === draft.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}