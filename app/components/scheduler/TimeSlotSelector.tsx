'use client'

import { useState, useEffect } from 'react'
import { 
  TIME_SLOT_PRESETS_UI, 
  TimeSlotPreset, 
  ContentType, 
  getJSTDate,
  getNextOptimalTime
} from '@/lib/time-slot-presets'
import TimeSlotCard from './TimeSlotCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarDays, Clock, Sparkles } from 'lucide-react'

interface TimeSlotSelectorProps {
  contentType?: ContentType
  selectedTimeSlot?: string | null
  onTimeSlotSelect?: (timeSlotId: string | null, scheduledTime: Date | null) => void
  defaultDate?: Date
  className?: string
}

export default function TimeSlotSelector({
  contentType = 'business',
  selectedTimeSlot,
  onTimeSlotSelect,
  defaultDate = new Date(),
  className = ''
}: TimeSlotSelectorProps) {
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(selectedTimeSlot || null)
  const [customDate, setCustomDate] = useState<Date>(defaultDate)
  const [customTime, setCustomTime] = useState<string>('')
  const [useCustomTime, setUseCustomTime] = useState(false)
  
  const jstNow = getJSTDate()
  const recommendedSlots = TIME_SLOT_PRESETS_UI // 推奨スロットとして全てのプリセットを使用
  
  // 選択が変更された時の処理
  useEffect(() => {
    if (selectedSlot && !useCustomTime) {
      // 選択されたスロットから時間を取得
      const slot = recommendedSlots.find(s => s.id === selectedSlot)
      if (slot) {
        const [hours, minutes] = slot.weekdayTime.split('-')[0].split(':').map(Number)
        const scheduledTime = new Date(customDate)
        scheduledTime.setHours(hours, minutes, 0, 0)
        onTimeSlotSelect?.(selectedSlot, scheduledTime)
      }
    } else if (useCustomTime && customTime) {
      const [hours, minutes] = customTime.split(':').map(Number)
      const scheduledTime = new Date(customDate)
      scheduledTime.setHours(hours, minutes, 0, 0)
      onTimeSlotSelect?.(null, scheduledTime)
    } else {
      onTimeSlotSelect?.(null, null)
    }
  }, [selectedSlot, customDate, customTime, useCustomTime])

  const handleSlotSelect = (timeSlotId: string) => {
    setSelectedSlot(selectedSlot === timeSlotId ? null : timeSlotId)
    setUseCustomTime(false)
  }

  const handleCustomTimeToggle = () => {
    setUseCustomTime(!useCustomTime)
    setSelectedSlot(null)
    if (!customTime) {
      // デフォルト時間を設定
      const now = getJSTDate()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      setCustomTime(`${hours}:${minutes}`)
    }
  }

  const getScheduledTimePreview = () => {
    if (useCustomTime && customTime) {
      const [hours, minutes] = customTime.split(':').map(Number)
      const scheduled = new Date(customDate)
      scheduled.setHours(hours, minutes, 0, 0)
      return scheduled.toLocaleString('ja-JP', { 
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' JST'
    } else if (selectedSlot) {
      const slot = recommendedSlots.find(s => s.id === selectedSlot)
      if (slot) {
        const timeRange = slot.weekdayTime
        return `${customDate.toLocaleDateString('ja-JP')} ${timeRange} JST`
      }
    }
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          投稿時間の選択
        </h3>
        <p className="text-sm text-gray-600">
          コンテンツタイプ「{contentType}」に最適な時間帯を選択してください
        </p>
      </div>

      {/* 推奨時間帯の表示 */}
      {recommendedSlots.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              このコンテンツタイプに推奨
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendedSlots.map(slot => (
              <Badge 
                key={slot.id}
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                {slot.icon} {slot.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 日付選択 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <CalendarDays className="w-4 h-4" />
            <span>投稿日時設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="schedule-date">投稿日</Label>
            <Input
              id="schedule-date"
              type="date"
              value={customDate.toISOString().split('T')[0]}
              onChange={(e) => setCustomDate(new Date(e.target.value))}
              min={jstNow.toISOString().split('T')[0]}
              className="mt-1"
            />
          </div>

          {/* カスタム時間設定 */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="custom-time"
                checked={useCustomTime}
                onChange={handleCustomTimeToggle}
                className="rounded border-gray-300"
              />
              <Label htmlFor="custom-time" className="text-sm">
                カスタム時間を指定
              </Label>
            </div>
            
            {useCustomTime && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="flex-1"
                />
                <span className="text-xs text-gray-500">JST</span>
              </div>
            )}
          </div>

          {/* 予定時間プレビュー */}
          {getScheduledTimePreview() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  投稿予定時間
                </span>
              </div>
              <p className="text-blue-700 font-mono text-sm mt-1">
                {getScheduledTimePreview()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 時間帯プリセット選択 */}
      {!useCustomTime && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            時間帯プリセット
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedSlots.map(preset => (
              <TimeSlotCard
                key={preset.id}
                preset={preset}
                selected={selectedSlot === preset.id}
                contentType={contentType}
                onClick={() => handleSlotSelect(preset.id)}
                scheduledDate={customDate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}