'use client'

import AppLayout from '@/app/components/layout/AppLayout'
import ScheduleCalendar from '@/app/components/scheduler/ScheduleCalendar'
import { Calendar, Settings } from 'lucide-react'
import { useState } from 'react'

interface PostingRule {
  minInterval: number // minutes
  maxPerDay: number
  activeHours: { start: number; end: number }
}

export default function SchedulerPage() {
  const [rules, setRules] = useState<PostingRule>({
    minInterval: 120,
    maxPerDay: 10,
    activeHours: { start: 6, end: 24 }
  })
  const [showSettings, setShowSettings] = useState(false)

  return (
    <AppLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-8 h-8 mr-3 text-blue-500" />
              スケジューラー
            </h1>
            <p className="mt-2 text-gray-600">
              投稿を計画的にスケジュールし、最適なタイミングで配信します
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Settings className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">投稿ルール設定</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最小投稿間隔（分）
              </label>
              <input
                type="number"
                value={rules.minInterval}
                onChange={(e) => setRules({ ...rules, minInterval: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1日の最大投稿数
              </label>
              <input
                type="number"
                value={rules.maxPerDay}
                onChange={(e) => setRules({ ...rules, maxPerDay: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿時間帯
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={rules.activeHours.start}
                  onChange={(e) => setRules({ 
                    ...rules, 
                    activeHours: { ...rules.activeHours, start: parseInt(e.target.value) }
                  })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  max="23"
                />
                <span className="text-gray-600">時 〜</span>
                <input
                  type="number"
                  value={rules.activeHours.end}
                  onChange={(e) => setRules({ 
                    ...rules, 
                    activeHours: { ...rules.activeHours, end: parseInt(e.target.value) }
                  })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  max="24"
                />
                <span className="text-gray-600">時</span>
              </div>
            </div>
            <button className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              ルールを保存
            </button>
          </div>
        </div>
      )}

      <ScheduleCalendar />
    </AppLayout>
  )
}