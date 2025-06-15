'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Save, 
  Send, 
  Calendar,
  Loader2,
  ArrowLeft,
  Hash,
  Clock,
  X,
  Plus,
  Eye,
  FileText,
  AlertCircle
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
  visualGuide: string | null
  kpis: any
  riskAssessment: any
  optimizationTips: any
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

const TWITTER_MAX_LENGTH = 280

export default function CotDraftEditPage() {
  const params = useParams()
  const router = useRouter()
  const draftId = params.draftId as string

  const [draft, setDraft] = useState<CotDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)

  // 編集可能なフィールド
  const [title, setTitle] = useState('')
  const [hook, setHook] = useState('')
  const [angle, setAngle] = useState('')
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [newHashtag, setNewHashtag] = useState('')
  const [visualGuide, setVisualGuide] = useState('')
  const [timing, setTiming] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  // 文字数カウント
  const getContentLength = useCallback(() => {
    const hashtagText = hashtags.map(tag => `#${tag}`).join(' ')
    const fullContent = content + (hashtagText ? ` ${hashtagText}` : '')
    return fullContent.length
  }, [content, hashtags])

  useEffect(() => {
    fetchDraft()
  }, [draftId])

  const fetchDraft = async () => {
    try {
      const response = await fetch(`/api/viral/cot-draft/${draftId}`)
      if (!response.ok) throw new Error('Failed to fetch draft')
      const data = await response.json()
      
      const draftData = data.draft
      setDraft(draftData)
      
      // フィールドの初期値設定
      setTitle(draftData.title)
      setHook(draftData.hook)
      setAngle(draftData.angle)
      setContent(draftData.editedContent || draftData.content || '')
      setHashtags(draftData.hashtags || [])
      setVisualGuide(draftData.visualGuide || '')
      setTiming(draftData.timing)
      
      if (draftData.scheduledAt) {
        // ISO形式を datetime-local 形式に変換
        const date = new Date(draftData.scheduledAt)
        const localDateTime = format(date, "yyyy-MM-dd'T'HH:mm")
        setScheduledAt(localDateTime)
      }
    } catch (error) {
      console.error('Error fetching draft:', error)
      alert('下書きの読み込みに失敗しました')
      router.push('/viral/cot/drafts')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/viral/cot-draft/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          hook,
          angle,
          editedContent: content,
          hashtags,
          visualGuide,
          timing,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
        })
      })

      if (!response.ok) throw new Error('Failed to save draft')
      
      const data = await response.json()
      setDraft(data.draft)
      alert('保存しました')
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handlePost = async () => {
    if (!confirm('今すぐTwitterに投稿しますか？')) return

    setPosting(true)
    try {
      const response = await fetch(`/api/viral/cot-draft/${draftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to post')
      }
      
      alert('投稿しました！')
      router.push('/viral/cot/drafts')
    } catch (error) {
      console.error('Error posting draft:', error)
      alert('投稿に失敗しました: ' + (error as Error).message)
    } finally {
      setPosting(false)
    }
  }

  const handleAddHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag)) {
      setHashtags([...hashtags, newHashtag.replace('#', '')])
      setNewHashtag('')
    }
  }

  const handleRemoveHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index))
  }

  const getPreviewContent = () => {
    const hashtagText = hashtags.map(tag => `#${tag}`).join(' ')
    return content + (hashtagText ? `\n\n${hashtagText}` : '')
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

  if (!draft) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">下書きが見つかりません</p>
        </div>
      </AppLayout>
    )
  }

  const contentLength = getContentLength()
  const isOverLimit = contentLength > TWITTER_MAX_LENGTH

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/viral/cot/drafts')}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">下書き編集</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{draft.session.expertise}</Badge>
            <Badge variant="outline">{draft.session.platform}</Badge>
            <Badge variant="outline">{draft.format}</Badge>
          </div>
        </div>

        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">編集</TabsTrigger>
            <TabsTrigger value="preview">プレビュー</TabsTrigger>
            <TabsTrigger value="strategy">戦略</TabsTrigger>
          </TabsList>

          {/* 編集タブ */}
          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="コンテンツのタイトル"
                  />
                </div>

                <div>
                  <Label htmlFor="hook">フック（つかみ）</Label>
                  <Textarea
                    id="hook"
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    rows={3}
                    placeholder="読者の注意を引くオープニング"
                  />
                </div>

                <div>
                  <Label htmlFor="angle">角度・切り口</Label>
                  <Textarea
                    id="angle"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    rows={2}
                    placeholder="独自の視点や切り口"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>コンテンツ</CardTitle>
                <CardDescription>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                      {contentLength} / {TWITTER_MAX_LENGTH} 文字
                    </span>
                    {isOverLimit && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        文字数超過
                      </Badge>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    placeholder="投稿する内容を入力してください"
                    className={isOverLimit ? 'border-red-500' : ''}
                  />
                </div>

                {/* ハッシュタグ */}
                <div>
                  <Label>ハッシュタグ</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        placeholder="新しいハッシュタグ"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAddHashtag}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="pr-1">
                          #{tag}
                          <button
                            onClick={() => handleRemoveHashtag(index)}
                            className="ml-2 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ビジュアルガイド */}
                {visualGuide && (
                  <div>
                    <Label htmlFor="visual">ビジュアルガイド</Label>
                    <Textarea
                      id="visual"
                      value={visualGuide}
                      onChange={(e) => setVisualGuide(e.target.value)}
                      rows={3}
                      placeholder="必要な画像や動画の説明"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>投稿設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="timing">投稿タイミング</Label>
                  <Input
                    id="timing"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    placeholder="例: 平日の朝7-9時、昼12-13時"
                  />
                </div>

                <div>
                  <Label htmlFor="scheduled">予約投稿</Label>
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    設定すると指定時刻に自動投稿されます
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* プレビュータブ */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>投稿プレビュー</CardTitle>
                <CardDescription>
                  実際の投稿イメージを確認できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">あなたの名前</span>
                        <span className="text-gray-500">@your_handle</span>
                        <span className="text-gray-500">・</span>
                        <span className="text-gray-500">今</span>
                      </div>
                      <div className="whitespace-pre-wrap text-gray-900">
                        {getPreviewContent()}
                      </div>
                      {visualGuide && (
                        <div className="mt-3 border rounded-lg p-4 bg-white">
                          <p className="text-sm text-gray-500 mb-1">ビジュアルガイド:</p>
                          <p className="text-sm">{visualGuide}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 戦略タブ */}
          <TabsContent value="strategy">
            <div className="space-y-6">
              {/* KPIs */}
              {draft.kpis && (
                <Card>
                  <CardHeader>
                    <CardTitle>成功指標（KPIs）</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
                      {JSON.stringify(draft.kpis, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* リスク評価 */}
              {draft.riskAssessment && (
                <Card>
                  <CardHeader>
                    <CardTitle>リスク評価</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
                      {JSON.stringify(draft.riskAssessment, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* 最適化のヒント */}
              {draft.optimizationTips && (
                <Card>
                  <CardHeader>
                    <CardTitle>最適化のヒント</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
                      {JSON.stringify(draft.optimizationTips, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* アクションボタン */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/viral/cot/result-v2/${draft.sessionId}`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            セッション詳細
          </Button>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saving || isOverLimit}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              保存
            </Button>
            
            {scheduledAt ? (
              <Button
                onClick={handleSave}
                disabled={saving || isOverLimit}
              >
                <Calendar className="w-4 h-4 mr-2" />
                予約を更新
              </Button>
            ) : (
              <Button
                onClick={handlePost}
                disabled={posting || isOverLimit || draft.status === 'POSTED'}
              >
                {posting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                今すぐ投稿
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}