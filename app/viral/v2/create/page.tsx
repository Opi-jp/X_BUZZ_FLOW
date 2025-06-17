'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export default function CreateViralSession() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('AIと働き方')
  const [platform, setPlatform] = useState('Twitter')
  const [style, setStyle] = useState('エンターテイメント')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/viral/v2/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, platform, style })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      router.push(`/viral/v2/sessions/${data.session.id}/topics`)
    } catch (error) {
      console.error('Error creating session:', error)
      alert('セッションの作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>新しいバイラルコンテンツを作成</CardTitle>
          <CardDescription>
            3ステップでバズるコンテンツを生成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">テーマ</Label>
              <Input
                id="theme"
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="例: AIと働き方、プログラミング教育、スタートアップ"
                required
              />
              <p className="text-sm text-muted-foreground">
                発信したい分野やトピックを自由に入力してください
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">プラットフォーム</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Twitter">Twitter</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">スタイル</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="エンターテイメント">エンターテイメント</SelectItem>
                  <SelectItem value="教育的">教育的</SelectItem>
                  <SelectItem value="解説">解説</SelectItem>
                  <SelectItem value="個人的な話">個人的な話</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '作成中...' : 'セッションを開始'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}