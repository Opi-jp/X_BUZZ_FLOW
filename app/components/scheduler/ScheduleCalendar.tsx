'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, AlertCircle } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ScheduledPost {
  id: string
  content: string
  scheduledAt: Date
  status: 'scheduled' | 'posted' | 'failed'
  type: 'single' | 'thread'
}

interface TimeSlotRecommendation {
  hour: number
  score: number
  reason: string
}

export default function ScheduleCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([])
  const [recommendations, setRecommendations] = useState<TimeSlotRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScheduledPosts()
    fetchRecommendations()
  }, [selectedDate])

  const fetchScheduledPosts = async () => {
    try {
      // TODO: 実際のAPIエンドポイントに置き換え
      const mockPosts: ScheduledPost[] = [
        {
          id: '1',
          content: 'AIの未来について考えてみた...',
          scheduledAt: new Date(),
          status: 'scheduled',
          type: 'single'
        }
      ]
      setScheduledPosts(mockPosts)
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    try {
      // TODO: 実際のAPIエンドポイントに置き換え
      const mockRecommendations: TimeSlotRecommendation[] = [
        { hour: 7, score: 0.85, reason: '朝の通勤時間帯' },
        { hour: 12, score: 0.92, reason: 'ランチタイムの高エンゲージメント' },
        { hour: 19, score: 0.88, reason: '帰宅時間帯のアクティブユーザー' },
        { hour: 22, score: 0.75, reason: '夜のリラックスタイム' }
      ]
      setRecommendations(mockRecommendations)
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    }
  }

  const weekStart = startOfWeek(selectedDate, { locale: ja, weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { locale: ja, weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getPostsForDay = (date: Date) => {
    return scheduledPosts.filter(post => 
      isSameDay(post.scheduledAt, date)
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          投稿スケジュール
        </h2>

        {/* カレンダービュー */}
        <div className="mb-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['月', '火', '水', '木', '金', '土', '日'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => {
              const posts = getPostsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isSelected = isSameDay(day, selectedDate)
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative p-4 rounded-lg border transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                    ${isToday ? 'font-bold' : ''}
                  `}
                >
                  <div className="text-sm">{format(day, 'd', { locale: ja })}</div>
                  {posts.length > 0 && (
                    <div className="mt-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto" />
                      <div className="text-xs text-gray-600 mt-1">{posts.length}件</div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* AI推奨時間 */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            {format(selectedDate, 'M月d日', { locale: ja })}のおすすめ投稿時間
          </h3>
          <div className="space-y-2">
            {recommendations.map(rec => (
              <div
                key={rec.hour}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="text-lg font-medium">{rec.hour}:00</div>
                  <div className="ml-3 text-sm text-gray-600">{rec.reason}</div>
                </div>
                <div className="flex items-center">
                  <div className="text-sm font-medium text-blue-600">
                    推奨度: {Math.round(rec.score * 100)}%
                  </div>
                  <button className="ml-3 px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
                    予約
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 投稿ルール */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-amber-900">現在の投稿ルール</h4>
              <ul className="mt-1 text-sm text-amber-700 space-y-1">
                <li>• 最小投稿間隔: 2時間</li>
                <li>• 1日の最大投稿数: 10件</li>
                <li>• 投稿時間帯: 6:00 - 24:00</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}