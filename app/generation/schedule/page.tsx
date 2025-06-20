'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, setHours, setMinutes } from 'date-fns'
import { ja } from 'date-fns/locale'

interface TimeSlot {
  hour: number
  minute: number
  label: string
}

const TIME_SLOTS: TimeSlot[] = [
  { hour: 7, minute: 0, label: '7:00 朝活タイム' },
  { hour: 8, minute: 30, label: '8:30 通勤タイム' },
  { hour: 12, minute: 0, label: '12:00 ランチタイム' },
  { hour: 15, minute: 0, label: '15:00 休憩タイム' },
  { hour: 18, minute: 0, label: '18:00 退勤タイム' },
  { hour: 20, minute: 0, label: '20:00 リラックスタイム' },
  { hour: 21, minute: 30, label: '21:30 ゴールデンタイム' },
  { hour: 23, minute: 0, label: '23:00 深夜タイム' }
]

interface Draft {
  id: string
  metadata: {
    conceptTitle: string
  }
  format: string
  content: string
}

export default function SchedulePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftIds = searchParams.get('draftIds')?.split(',') || []
  const singleDraftId = searchParams.get('draftId')
  
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlots, setSelectedSlots] = useState<{ [draftId: string]: Date }>({})
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const allDraftIds = singleDraftId ? [singleDraftId] : draftIds

  useEffect(() => {
    if (allDraftIds.length > 0) {
      fetchDrafts()
    }
  }, [])

  const fetchDrafts = async () => {
    try {
      const promises = allDraftIds.map(id => 
        fetch(`/api/create/draft/list/${id}`).then(res => res.json())
      )
      const results = await Promise.all(promises)
      setDrafts(results.map(r => r.draft).filter(Boolean))
    } catch (error) {
      console.error('Error fetching drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 })
  })

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleTimeSelect = (draftId: string, hour: number, minute: number) => {
    const scheduledTime = setMinutes(setHours(selectedDate, hour), minute)
    setSelectedSlots(prev => ({
      ...prev,
      [draftId]: scheduledTime
    }))
  }

  const handlePrevWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7))
  }

  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7))
  }

  const handleSubmit = async () => {
    const scheduledDrafts = Object.entries(selectedSlots)
    if (scheduledDrafts.length === 0) {
      alert('スケジュールする投稿を選択してください')
      return
    }

    setSubmitting(true)
    try {
      const promises = scheduledDrafts.map(([draftId, scheduledAt]) =>
        fetch(`/api/create/draft/list/${draftId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() })
        })
      )

      await Promise.all(promises)
      alert('スケジュールを設定しました！')
      router.push('/generation/drafts')
    } catch (error) {
      alert('スケジュール設定に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">下書きが見つかりません</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">投稿スケジュール設定</h1>
              <p className="mt-1 text-gray-600">
                {drafts.length}件の投稿をスケジュール
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              キャンセル
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* カレンダー */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">日付を選択</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium">
                    {format(currentWeek, 'yyyy年MM月', { locale: ja })}
                  </span>
                  <button
                    onClick={handleNextWeek}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['月', '火', '水', '木', '金', '土', '日'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                {weekDays.map(day => (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateSelect(day)}
                    className={`
                      p-4 rounded-lg text-center transition-colors
                      ${isSameDay(day, selectedDate)
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100'
                      }
                      ${day < new Date() ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    disabled={day < new Date()}
                  >
                    <div className="text-2xl font-semibold">{format(day, 'd')}</div>
                    <div className="text-xs mt-1">
                      {format(day, 'EEE', { locale: ja })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 時間帯選択 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4">
                {format(selectedDate, 'M月d日', { locale: ja })}の時間帯
              </h2>
              
              <div className="space-y-4">
                {drafts.map(draft => (
                  <div key={draft.id} className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      {draft.metadata.conceptTitle}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {TIME_SLOTS.map(slot => {
                        const isSelected = selectedSlots[draft.id] && 
                          format(selectedSlots[draft.id], 'HH:mm') === 
                          `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`
                        
                        return (
                          <button
                            key={`${slot.hour}-${slot.minute}`}
                            onClick={() => handleTimeSelect(draft.id, slot.hour, slot.minute)}
                            className={`
                              p-3 rounded-lg text-sm transition-colors
                              ${isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                              }
                            `}
                          >
                            <div className="font-medium">
                              {slot.hour}:{slot.minute.toString().padStart(2, '0')}
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              {slot.label.split(' ')[1]}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h3 className="text-lg font-semibold mb-4">スケジュール確認</h3>
              
              {Object.keys(selectedSlots).length === 0 ? (
                <p className="text-gray-500 text-sm">
                  投稿する時間を選択してください
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(selectedSlots).map(([draftId, scheduledAt]) => {
                    const draft = drafts.find(d => d.id === draftId)
                    if (!draft) return null
                    
                    return (
                      <div key={draftId} className="border rounded-lg p-3">
                        <p className="font-medium text-sm text-gray-900">
                          {draft.metadata.conceptTitle}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          {format(scheduledAt, 'M月d日 HH:mm', { locale: ja })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={Object.keys(selectedSlots).length === 0 || submitting}
                className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    設定中...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    スケジュール設定
                  </>
                )}
              </button>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  おすすめの投稿時間
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 7:00-9:00 通勤時間帯</li>
                  <li>• 12:00-13:00 ランチタイム</li>
                  <li>• 20:00-22:00 ゴールデンタイム</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}