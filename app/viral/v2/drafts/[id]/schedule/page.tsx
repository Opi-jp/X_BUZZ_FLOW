'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, ChevronLeft, TrendingUp, Coffee, Sun, Moon, Sparkles } from 'lucide-react'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

interface TimeSlot {
  time: string
  label: string
  description: string
  icon: JSX.Element
  effectiveness: 'high' | 'medium' | 'low'
}

export default function ScheduleDraftPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    fetchDraft()
    // デフォルトの日時を設定（次の朝7時）
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(7, 0, 0, 0)
    setScheduledDate(tomorrow.toISOString().split('T')[0])
    setScheduledTime('07:00')
  }, [id])

  const fetchDraft = async () => {
    try {
      const response = await fetch(`/api/viral/v2/drafts/${id}`)
      if (!response.ok) throw new Error('Failed to fetch draft')
      const data = await response.json()
      setDraft(data.draft)
    } catch (error) {
      console.error('Error fetching draft:', error)
      alert('下書きの取得に失敗しました')
      router.push('/viral/v2/drafts')
    } finally {
      setLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      alert('日時を選択してください')
      return
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`)
    if (scheduledAt <= new Date()) {
      alert('過去の日時は選択できません')
      return
    }

    setScheduling(true)
    try {
      const response = await fetch(`/api/viral/v2/drafts/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() })
      })

      if (!response.ok) {
        throw new Error('Failed to schedule draft')
      }

      alert(`${scheduledAt.toLocaleString('ja-JP')}に投稿予約しました`)
      router.push('/viral/v2/drafts')
    } catch (error) {
      console.error('Error scheduling draft:', error)
      alert('スケジュール設定に失敗しました')
    } finally {
      setScheduling(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="text-center">下書きが見つかりません</div>
      </div>
    )
  }

  // 選択された日が平日か週末かを判定
  const isWeekend = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = date.getDay()
    return day === 0 || day === 6
  }

  // 推奨投稿時間（平日・週末で切り替え）
  const getRecommendedTimes = (dateStr: string): TimeSlot[] => {
    const weekend = isWeekend(dateStr)
    
    if (weekend) {
      return [
        { 
          time: '09:00', 
          label: '週末の朝', 
          description: '起床遅めでも朝のSNSチェック',
          icon: <Coffee className="w-4 h-4" />,
          effectiveness: 'medium'
        },
        { 
          time: '13:00', 
          label: '週末の昼下がり', 
          description: 'ゴールデンタイム開始',
          icon: <Sun className="w-4 h-4" />,
          effectiveness: 'high'
        },
        { 
          time: '15:00', 
          label: '週末の午後', 
          description: '最も投稿が伸びやすい時間帯',
          icon: <TrendingUp className="w-4 h-4" />,
          effectiveness: 'high'
        },
        { 
          time: '20:00', 
          label: '週末の夜', 
          description: '日曜夜は週末最大のユーザー数',
          icon: <Moon className="w-4 h-4" />,
          effectiveness: 'high'
        },
      ]
    } else {
      return [
        { 
          time: '07:00', 
          label: '通勤時間帯', 
          description: '投稿が埋もれにくく情報収集欲高',
          icon: <Coffee className="w-4 h-4" />,
          effectiveness: 'high'
        },
        { 
          time: '12:00', 
          label: 'ランチタイム', 
          description: '多くの人がチェック、競合多',
          icon: <Sun className="w-4 h-4" />,
          effectiveness: 'medium'
        },
        { 
          time: '15:00', 
          label: '午後のピーク', 
          description: 'RT数最多でエンゲージメント高',
          icon: <TrendingUp className="w-4 h-4" />,
          effectiveness: 'high'
        },
        { 
          time: '21:00', 
          label: 'ゴールデンタイム', 
          description: '平日最大のアクティブユーザー',
          icon: <Sparkles className="w-4 h-4" />,
          effectiveness: 'high'
        },
      ]
    }
  }

  const recommendedTimes = getRecommendedTimes(scheduledDate)

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return ''
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/viral/v2/drafts')}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          下書き一覧に戻る
        </Button>
        <h1 className="text-3xl font-bold mb-2">投稿スケジュール設定</h1>
        <p className="text-muted-foreground">
          最適な投稿時間を選んで、エンゲージメントを最大化しましょう
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{draft.title}</CardTitle>
          <CardDescription>
            <div className="text-sm mt-2 line-clamp-3">
              {draft.content}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>スケジュール設定</CardTitle>
          <CardDescription>
            {scheduledDate && (isWeekend(scheduledDate) ? '週末' : '平日')}の推奨時間帯を参考にしてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">
                <Calendar className="w-4 h-4 inline mr-1" />
                投稿日
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">
                <Clock className="w-4 h-4 inline mr-1" />
                投稿時刻 (JST)
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">
              {scheduledDate && (isWeekend(scheduledDate) ? '週末' : '平日')}の推奨投稿時間
            </p>
            <div className="space-y-2">
              {recommendedTimes.map((rec) => (
                <button
                  key={rec.time}
                  onClick={() => setScheduledTime(rec.time)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
                    scheduledTime === rec.time ? 'ring-2 ring-primary' : ''
                  } ${getEffectivenessColor(rec.effectiveness)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{rec.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {rec.time} - {rec.label}
                        {rec.effectiveness === 'high' && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">高効果</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {rec.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSchedule}
              disabled={scheduling}
              className="flex-1"
            >
              {scheduling ? 'スケジュール設定中...' : 'スケジュールを設定'}
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