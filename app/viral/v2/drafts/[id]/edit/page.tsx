'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Hash, X, Plus } from 'lucide-react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditDraftPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // 編集用の状態
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [newHashtag, setNewHashtag] = useState('')
  const [visualNote, setVisualNote] = useState('')

  useEffect(() => {
    fetchDraft()
  }, [id])

  const fetchDraft = async () => {
    try {
      const response = await fetch(`/api/viral/v2/drafts/${id}`)
      if (!response.ok) throw new Error('Failed to fetch draft')
      const data = await response.json()
      
      // 初期値を設定
      setDraft(data.draft)
      setTitle(data.draft.title)
      setContent(data.draft.content)
      setHashtags(data.draft.hashtags || [])
      setVisualNote(data.draft.visualNote || '')
    } catch (error) {
      console.error('Error fetching draft:', error)
      alert('下書きの取得に失敗しました')
      router.push('/viral/v2/drafts')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/viral/v2/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          hashtags,
          visualNote
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save draft')
      }

      alert('下書きを保存しました')
      router.push('/viral/v2/drafts')
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag)) {
      const tag = newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`
      setHashtags([...hashtags, tag])
      setNewHashtag('')
    }
  }

  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addHashtag()
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="text-center">下書きが見つかりません</div>
      </div>
    )
  }

  // 文字数カウント
  const charCount = content.length
  const isThread = content.includes('\n\n')
  const tweets = isThread ? content.split('\n\n').filter(t => t.trim()) : []

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/viral/v2/drafts')}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          下書き一覧に戻る
        </Button>
        <h1 className="text-3xl font-bold mb-2">下書きを編集</h1>
        <p className="text-muted-foreground">
          投稿内容を編集してから投稿またはスケジュール設定してください
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">タイトル（内部管理用）</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="投稿の概要を入力"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="content">投稿内容</Label>
              <div className="text-sm text-muted-foreground">
                {charCount}文字
                {isThread && ` (${tweets.length}ツイート)`}
              </div>
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="投稿内容を入力..."
              className="min-h-[300px] font-mono"
            />
            {isThread && (
              <p className="text-sm text-muted-foreground">
                スレッド形式：空行で区切られた各段落が個別のツイートとして投稿されます
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>ハッシュタグ</Label>
            <div className="flex gap-2">
              <Input
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="ハッシュタグを追加"
                className="flex-1"
              />
              <Button type="button" onClick={addHashtag} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {hashtags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1">
                  <Hash className="w-3 h-3 mr-1" />
                  {tag.replace('#', '')}
                  <button
                    onClick={() => removeHashtag(index)}
                    className="ml-2 hover:bg-muted rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visualNote">ビジュアルノート（任意）</Label>
            <Textarea
              id="visualNote"
              value={visualNote}
              onChange={(e) => setVisualNote(e.target.value)}
              placeholder="必要な画像や動画についてのメモ"
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="flex-1"
            >
              {saving ? '保存中...' : '保存'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/viral/v2/drafts')}
            >
              キャンセル
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}