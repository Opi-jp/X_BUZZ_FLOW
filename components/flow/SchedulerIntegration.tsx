'use client'

import { useState } from 'react'
import { Calendar, Clock, Send, AlertCircle } from 'lucide-react'
import { formatJST, formatPresets } from '@/lib/utils/date-jst'

interface SchedulerIntegrationProps {
  draftId: string
  onSchedule: (scheduledAt: Date) => Promise<void>
  onPublishNow: () => Promise<void>
  isLoading?: boolean
}

export function SchedulerIntegration({ 
  draftId, 
  onSchedule, 
  onPublishNow,
  isLoading 
}: SchedulerIntegrationProps) {
  const [showScheduler, setShowScheduler] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 現在から最小30分後を初期値に設定
  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    return now.toISOString().slice(0, 16)
  }

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime) {
      setError('日付と時刻を選択してください')
      return
    }

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}`)
    if (scheduledAt <= new Date()) {
      setError('過去の日時は選択できません')
      return
    }

    try {
      await onSchedule(scheduledAt)
      setShowScheduler(false)
      setError(null)
    } catch (err) {
      setError('スケジュール設定に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      {/* アクションボタン */}
      <div className="flex gap-3">
        <button
          onClick={onPublishNow}
          disabled={isLoading}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
            ${!isLoading
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <Send className="w-5 h-5" />
          今すぐ投稿
        </button>

        <button
          onClick={() => setShowScheduler(!showScheduler)}
          disabled={isLoading}
          className={`
            flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all border-2
            ${!isLoading
              ? 'border-purple-600 text-purple-600 hover:bg-purple-50'
              : 'border-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <Calendar className="w-5 h-5" />
          予約投稿
        </button>
      </div>

      {/* スケジューラーUI */}
      {showScheduler && (
        <div className="bg-purple-50 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            投稿日時を選択
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日付
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                時刻（JST）
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* 選択した日時の表示 */}
          {selectedDate && selectedTime && (
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">投稿予定日時:</p>
              <p className="font-medium text-gray-900">
                {formatJST(new Date(`${selectedDate}T${selectedTime}`), 'yyyy年MM月dd日 HH:mm')} (JST)
              </p>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleSchedule}
              disabled={isLoading || !selectedDate || !selectedTime}
              className={`
                flex-1 px-4 py-2 rounded-lg font-medium transition-all
                ${!isLoading && selectedDate && selectedTime
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              予約を確定
            </button>
            <button
              onClick={() => {
                setShowScheduler(false)
                setError(null)
              }}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}