'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, Key, Share2, Bot, Bell, Shield } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  
  // Form states
  const [profile, setProfile] = useState({
    theme: 'クリエイティブ × AI活用',
    targetAudience: 'クリエイター、マーケター、起業家',
    contentStyle: 'educational',
    postingFrequency: '3',
    autoPost: false
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: "設定を保存しました",
        description: "変更が正常に保存されました。",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "設定の保存に失敗しました。",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">設定</h2>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? '保存中...' : '変更を保存'}
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">プロフィール設定</TabsTrigger>
            <TabsTrigger value="api">API設定</TabsTrigger>
            <TabsTrigger value="posting">投稿設定</TabsTrigger>
            <TabsTrigger value="notifications">通知設定</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>プロフィール情報</CardTitle>
                <CardDescription>
                  あなたの発信テーマとターゲットオーディエンスを設定してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">発信テーマ</Label>
                  <Textarea
                    id="theme"
                    placeholder="例: クリエイティブ × AI活用、マーケティング戦略"
                    value={profile.theme}
                    onChange={(e) => setProfile({...profile, theme: e.target.value})}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    AIがコンテンツを生成する際の基準となる発信テーマを入力してください
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">ターゲットオーディエンス</Label>
                  <Input
                    id="audience"
                    placeholder="例: クリエイター、マーケター、起業家"
                    value={profile.targetAudience}
                    onChange={(e) => setProfile({...profile, targetAudience: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">コンテンツスタイル</Label>
                  <Select
                    value={profile.contentStyle}
                    onValueChange={(value) => setProfile({...profile, contentStyle: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educational">教育的</SelectItem>
                      <SelectItem value="entertainment">エンターテイメント</SelectItem>
                      <SelectItem value="informative">情報提供</SelectItem>
                      <SelectItem value="personal">個人的な話</SelectItem>
                      <SelectItem value="mixed">ミックス</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API設定</CardTitle>
                <CardDescription>
                  外部サービスのAPIキーを管理します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai">OpenAI API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="openai"
                      type="password"
                      placeholder="sk-..."
                      className="font-mono"
                    />
                    <Button variant="outline" size="sm">
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    GPT-4の利用に必要です
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter API Credentials</Label>
                  <div className="space-y-2">
                    <Input placeholder="API Key" />
                    <Input placeholder="API Secret" type="password" />
                    <Input placeholder="Access Token" />
                    <Input placeholder="Access Token Secret" type="password" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    自動投稿に必要です
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google">Google Search API</Label>
                  <Input
                    id="google"
                    type="password"
                    placeholder="AIza..."
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    トレンド検索に使用します
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>投稿設定</CardTitle>
                <CardDescription>
                  自動投稿の頻度とルールを設定します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自動投稿</Label>
                    <p className="text-sm text-muted-foreground">
                      AIが生成したコンテンツを自動的に投稿します
                    </p>
                  </div>
                  <Switch
                    checked={profile.autoPost}
                    onCheckedChange={(checked) => setProfile({...profile, autoPost: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">投稿頻度</Label>
                  <Select
                    value={profile.postingFrequency}
                    onValueChange={(value) => setProfile({...profile, postingFrequency: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1日1回</SelectItem>
                      <SelectItem value="2">1日2回</SelectItem>
                      <SelectItem value="3">1日3回</SelectItem>
                      <SelectItem value="5">1日5回</SelectItem>
                      <SelectItem value="10">1日10回</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>投稿時間帯</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['朝 (6-9時)', '昼 (12-14時)', '夕方 (17-19時)', '夜 (20-22時)'].map((time) => (
                      <label key={time} className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{time}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>投稿前の確認</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" defaultChecked />
                      <span className="text-sm">投稿前に内容を確認する</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">センシティブな内容を自動でフィルタリング</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>通知設定</CardTitle>
                <CardDescription>
                  重要なイベントの通知方法を設定します
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>投稿成功通知</Label>
                      <p className="text-sm text-muted-foreground">
                        投稿が成功したときに通知を受け取る
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>エラー通知</Label>
                      <p className="text-sm text-muted-foreground">
                        エラーが発生したときに通知を受け取る
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>パフォーマンス通知</Label>
                      <p className="text-sm text-muted-foreground">
                        投稿が高いエンゲージメントを獲得したときに通知
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>週次レポート</Label>
                      <p className="text-sm text-muted-foreground">
                        毎週のパフォーマンスサマリーを受け取る
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="email">通知メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}