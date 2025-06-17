'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, Send, ChevronRight } from 'lucide-react'

interface Draft {
  id: string
  title: string
  content: string
  status: string
  conceptNumber: number
  format: string
  scheduledAt?: string
}

export default function SchedulerPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set())
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledTime, setScheduledTime] = useState('')
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    if (sessionId) {
      fetchDrafts()
    }
  }, [sessionId])

  const fetchDrafts = async () => {
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}/drafts`)
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.drafts || [])
        // デフォルトで全ての下書きを選択
        setSelectedDrafts(new Set(data.drafts.map((d: Draft) => d.id)))
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (selectedDrafts.size === 0) {
      alert('投稿する下書きを選択してください')
      return
    }

    setScheduling(true)
    try {
      const draftIds = Array.from(selectedDrafts)
      
      if (scheduleType === 'immediate') {
        // 即座に投稿
        for (const draftId of draftIds) {
          const response = await fetch('/api/viral/post-draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftId })
          })
          
          if (!response.ok) {
            throw new Error('投稿に失敗しました')
          }
        }
        alert('投稿が完了しました！')
      } else {
        // スケジュール投稿
        if (!scheduledTime) {
          alert('投稿日時を設定してください')
          return
        }

        for (const draftId of draftIds) {
          const response = await fetch(`/api/viral/drafts/${draftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'SCHEDULED',
              scheduledAt: new Date(scheduledTime).toISOString()
            })
          })
          
          if (!response.ok) {
            throw new Error('スケジュール設定に失敗しました')
          }
        }
        alert('スケジュール設定が完了しました！')
      }
      
      // 成功後はダッシュボードへ
      window.location.href = '/viral/drafts'
    } catch (error) {
      alert(error instanceof Error ? error.message : '処理中にエラーが発生しました')
    } finally {
      setScheduling(false)
    }
  }

  const toggleDraftSelection = (draftId: string) => {
    const newSelected = new Set(selectedDrafts)
    if (newSelected.has(draftId)) {
      newSelected.delete(draftId)
    } else {
      newSelected.add(draftId)
    }
    setSelectedDrafts(newSelected)
  }

  if (!sessionId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">セッションIDが指定されていません。</p>
          <Link href="/viral/cot" className="text-blue-600 hover:underline mt-2 inline-block">
            Chain of Thoughtページへ戻る
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">下書きを読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          投稿スケジューラー
        </h1>
        <p className="text-gray-600">
          生成された下書きの投稿タイミングを設定します
        </p>
      </div>

      {/* 下書き選択 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">投稿する下書きを選択</h2>
        <div className="space-y-3">
          {drafts.map((draft) => (
            <label 
              key={draft.id} 
              className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedDrafts.has(draft.id)}
                onChange={() => toggleDraftSelection(draft.id)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-500">
                    コンセプト{draft.conceptNumber}
                  </span>
                  <span className="text-sm px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {draft.format}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">{draft.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{draft.content}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* スケジュール設定 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">投稿タイミング</h2>
        
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="immediate"
              checked={scheduleType === 'immediate'}
              onChange={(e) => setScheduleType(e.target.value as 'immediate' | 'scheduled')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">今すぐ投稿</div>
              <div className="text-sm text-gray-600">選択した下書きを即座に投稿します</div>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="scheduled"
              checked={scheduleType === 'scheduled'}
              onChange={(e) => setScheduleType(e.target.value as 'immediate' | 'scheduled')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">スケジュール投稿</div>
              <div className="text-sm text-gray-600">指定した日時に自動投稿します</div>
            </div>
          </label>

          {scheduleType === 'scheduled' && (
            <div className="ml-7 mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投稿日時を設定
              </label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-between items-center">
        <Link
          href="/viral/drafts"
          className="text-gray-600 hover:text-gray-800"
        >
          ← 下書き一覧に戻る
        </Link>
        
        <button
          onClick={handleSchedule}
          disabled={scheduling || selectedDrafts.size === 0}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {scheduling ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              処理中...
            </>
          ) : (
            <>
              {scheduleType === 'immediate' ? (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  今すぐ投稿
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  スケジュール設定
                </>
              )}
              {selectedDrafts.size > 0 && (
                <span className="ml-2 text-sm">
                  ({selectedDrafts.size}件)
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* 推奨投稿時間のヒント */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 推奨投稿時間</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 平日の朝: 7:00-9:00（通勤時間帯）</li>
          <li>• 昼休み: 12:00-13:00</li>
          <li>• 夕方: 18:00-20:00（帰宅時間帯）</li>
          <li>• 週末: 10:00-12:00, 20:00-22:00</li>
        </ul>
      </div>
    </div>
  )
}