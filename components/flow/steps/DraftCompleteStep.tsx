'use client'

import { useState } from 'react'
import { Check, FileText, ExternalLink, Edit, Trash2 } from 'lucide-react'
import { SchedulerIntegration } from '../SchedulerIntegration'
import { formatJST } from '@/lib/utils/date-jst'

interface DraftData {
  id: string
  title: string
  content: string
  hashtags?: string[]
  characterId: string
  postFormat: 'single' | 'thread'
  createdAt: Date
  updatedAt: Date
}

interface DraftCompleteStepProps {
  draft: DraftData
  onPublishNow: () => Promise<void>
  onSchedule: (scheduledAt: Date) => Promise<void>
  onEdit?: () => void
  onDelete?: () => void
  isLoading?: boolean
}

export function DraftCompleteStep({ 
  draft,
  onPublishNow,
  onSchedule,
  onEdit,
  onDelete,
  isLoading 
}: DraftCompleteStepProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="space-y-6">
      {/* 完了メッセージ */}
      <div className="bg-green-50 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              下書きが作成されました！
            </h3>
            <p className="text-gray-700">
              Cardi Dareのキャラクターで{draft.postFormat === 'thread' ? 'スレッド形式' : 'シングル投稿'}の
              下書きが作成されました。すぐに投稿するか、後で投稿するかを選択できます。
            </p>
          </div>
        </div>
      </div>

      {/* 下書き情報 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">{draft.title}</h4>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="編集"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* メタデータ */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">作成日時</p>
              <p className="text-gray-900">{formatJST(draft.createdAt, 'yyyy年MM月dd日 HH:mm')}</p>
            </div>
            <div>
              <p className="text-gray-500">形式</p>
              <p className="text-gray-900">
                {draft.postFormat === 'thread' ? 'スレッド投稿' : 'シングル投稿'}
              </p>
            </div>
          </div>

          {/* プレビュー切り替え */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            {showDetails ? 'プレビューを隠す' : 'プレビューを表示'}
          </button>

          {/* コンテンツプレビュー */}
          {showDetails && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-gray-900 whitespace-pre-wrap">{draft.content}</p>
              {draft.hashtags && draft.hashtags.length > 0 && (
                <p className="text-blue-600 text-sm">
                  {draft.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 管理画面へのリンク */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">下書き管理画面</p>
            <p className="text-sm text-blue-700 mt-1">
              作成した下書きは
              <a href="/drafts" className="underline hover:no-underline mx-1">
                下書き管理画面
              </a>
              からいつでも確認・編集できます。
            </p>
          </div>
        </div>
      </div>

      {/* スケジューラー統合 */}
      <SchedulerIntegration
        draftId={draft.id}
        onSchedule={onSchedule}
        onPublishNow={onPublishNow}
        isLoading={isLoading}
      />
    </div>
  )
}