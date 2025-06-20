'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import TimeSlotSelector from './TimeSlotSelector'
import { 
  ContentType, 
  getJSTDate,
  detectContentType,
  getNextOptimalTime
} from '@/lib/time-slot-presets'
import { 
  generateSelfRTPlan,
  suggestOptimalSelfRTTiming,
  SelfRTSchedule,
  SelfRTSuggestion,
  SELF_RT_STRATEGIES
} from '@/lib/self-rt-strategies'
import { 
  Calendar, 
  Clock, 
  Repeat, 
  TrendingUp, 
  Users,
  Sparkles,
  MessageCircle,
  BarChart3
} from 'lucide-react'

interface DraftSchedulerProps {
  draftId: string
  content: string
  format?: string
  onSchedule: (scheduleData: ScheduleData) => void
  className?: string
}

interface ScheduleData {
  scheduledAt: Date
  timeSlotId?: string
  selfRTEnabled: boolean
  selfRTSchedules: SelfRTSchedule[]
  customComment?: string
}

// コンテンツタイプ検出関数（簡易版）
function detectContentType(content: string, format?: string): ContentType {
  const text = content.toLowerCase()
  
  if (text.includes('ニュース') || text.includes('速報') || text.includes('発表')) {
    return 'news'
  }
  if (text.includes('tips') || text.includes('コツ') || text.includes('方法') || text.includes('やり方')) {
    return 'tips'
  }
  if (format === 'thread' || text.includes('スレッド') || text.includes('1/')) {
    return 'thread'
  }
  if (text.includes('どう思') || text.includes('議論') || text.includes('意見')) {
    return 'discussion'
  }
  if (text.includes('面白') || text.includes('楽し') || text.includes('😄') || text.includes('🎉')) {
    return 'entertainment'
  }
  
  return 'general'
}

export default function DraftScheduler({
  draftId,
  content,
  format,
  onSchedule,
  className = ''
}: DraftSchedulerProps) {
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [scheduledTime, setScheduledTime] = useState<Date | null>(null)
  const [selfRTEnabled, setSelfRTEnabled] = useState(false)
  const [customComment, setCustomComment] = useState('')
  const [selfRTSchedules, setSelfRTSchedules] = useState<SelfRTSchedule[]>([])
  const [rtSuggestions, setRtSuggestions] = useState<SelfRTSuggestion[]>([])
  
  const contentType = detectContentType(content, format)
  const strategy = SELF_RT_STRATEGIES[contentType]
  const jstNow = getJSTDate()

  // セルフRT計画の更新
  useEffect(() => {
    if (scheduledTime && selfRTEnabled) {
      const plans = generateSelfRTPlan(scheduledTime, contentType)
      setSelfRTSchedules(plans)
      
      const suggestions = suggestOptimalSelfRTTiming(scheduledTime, contentType)
      setRtSuggestions(suggestions)
    } else {
      setSelfRTSchedules([])
      setRtSuggestions([])
    }
  }, [scheduledTime, selfRTEnabled, contentType])

  // 初期セルフRT有効状態
  useEffect(() => {
    setSelfRTEnabled(strategy.enabled && contentType !== 'general')
  }, [contentType])

  const handleTimeSlotSelect = (timeSlotId: string | null, scheduledAt: Date | null) => {
    setSelectedTimeSlot(timeSlotId)
    setScheduledTime(scheduledAt)
  }

  const handleScheduleSubmit = () => {
    if (!scheduledTime) return

    const scheduleData: ScheduleData = {
      scheduledAt: scheduledTime,
      timeSlotId: selectedTimeSlot || undefined,
      selfRTEnabled,
      selfRTSchedules: selfRTEnabled ? selfRTSchedules : [],
      customComment: customComment || undefined
    }

    onSchedule(scheduleData)
  }

  const getTotalReachIncrease = () => {
    return rtSuggestions.reduce((total, suggestion) => total + suggestion.expectedReach, 0)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>投稿スケジュール設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* コンテンツタイプ表示 */}
          <div className="flex items-center space-x-4">
            <div>
              <Label className="text-sm text-gray-600">検出されたコンテンツタイプ</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="capitalize">
                  {contentType}
                </Badge>
                <span className="text-sm text-gray-500">
                  ({strategy.enabled ? 'セルフRT推奨' : 'セルフRT非推奨'})
                </span>
              </div>
            </div>
          </div>

          {/* コンテンツプレビュー */}
          <div>
            <Label className="text-sm text-gray-600">投稿内容プレビュー</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg border max-h-20 overflow-y-auto">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {content.slice(0, 200)}{content.length > 200 ? '...' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 時間帯選択 */}
      <TimeSlotSelector
        contentType={contentType}
        selectedTimeSlot={selectedTimeSlot}
        onTimeSlotSelect={handleTimeSlotSelect}
        defaultDate={jstNow}
      />

      {/* セルフRT設定 */}
      {strategy.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Repeat className="w-5 h-5 text-blue-600" />
              <span>セルフRT設定</span>
              <Badge className="bg-blue-100 text-blue-800">推奨</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* セルフRT有効/無効 */}
            <div className="flex items-center space-x-3">
              <Switch
                id="self-rt-enabled"
                checked={selfRTEnabled}
                onCheckedChange={setSelfRTEnabled}
              />
              <Label htmlFor="self-rt-enabled" className="text-sm">
                セルフRT機能を有効にする
              </Label>
              {selfRTEnabled && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{getTotalReachIncrease()}% リーチ増加予測
                </Badge>
              )}
            </div>

            {/* セルフRT戦略説明 */}
            {selfRTEnabled && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">
                        {contentType}コンテンツの最適セルフRT戦略
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        異なる時間帯のオーディエンスに効果的にリーチし、投稿の露出を最大化します
                      </p>
                      
                      {/* RT予定表示 */}
                      {selfRTSchedules.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-blue-900">予定されたセルフRT:</h5>
                          {selfRTSchedules.map((schedule, index) => (
                            <div key={index} className="bg-white rounded p-3 border border-blue-200">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <span className="font-mono text-sm">
                                    {schedule.scheduledAt.toLocaleString('ja-JP', {
                                      timeZone: 'Asia/Tokyo',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })} JST
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    +{schedule.intervalHours}時間後
                                  </Badge>
                                </div>
                                {schedule.targetTimeSlot && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    {schedule.targetTimeSlot}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-1">{schedule.rationale}</p>
                              {schedule.comment && (
                                <div className="flex items-start space-x-2 mt-2">
                                  <MessageCircle className="w-3 h-3 text-gray-400 mt-0.5" />
                                  <p className="text-xs text-gray-700 italic">&ldquo;{schedule.comment}&rdquo;</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* リーチ予測 */}
                      {rtSuggestions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-blue-200">
                          <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-1" />
                            リーチ拡大予測
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {rtSuggestions.map((suggestion, index) => (
                              <div key={index} className="bg-white border border-blue-200 rounded p-2">
                                <div className="text-xs text-blue-800 font-medium">
                                  {suggestion.timeSlot.name}
                                </div>
                                <div className="text-lg font-bold text-blue-600">
                                  +{suggestion.expectedReach}%
                                </div>
                                <div className="text-xs text-gray-600">
                                  {suggestion.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* カスタムコメント */}
                <div>
                  <Label htmlFor="custom-comment" className="text-sm">
                    セルフRT時のコメント（オプション）
                  </Label>
                  <Textarea
                    id="custom-comment"
                    placeholder="例: 重要な内容なので再度シェアします 🔄"
                    value={customComment}
                    onChange={(e) => setCustomComment(e.target.value)}
                    className="mt-1 text-sm"
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    空白の場合、コンテンツタイプに応じたデフォルトコメントが使用されます
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* スケジュール確定ボタン */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleScheduleSubmit}
          disabled={!scheduledTime}
          className="px-6 py-2"
        >
          <Calendar className="w-4 h-4 mr-2" />
          スケジュール設定を完了
        </Button>
      </div>
    </div>
  )
}