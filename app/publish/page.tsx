'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Send, 
  Clock, 
  Calendar,
  Loader2, 
  AlertCircle, 
  Check, 
  RefreshCw,
  Settings,
  Zap,
  Users,
  BarChart3
} from 'lucide-react'
import { claudeLog } from '@/lib/core/claude-logger'

interface Draft {
  id: string
  title?: string
  content: string
  hashtags: string[]
  characterId: string
  status: string
  createdAt: string
  sessionId?: string
  metadata?: {
    conceptTitle?: string
    viralScore?: number
  }
}

interface PublishResult {
  draftId: string
  status: 'published' | 'scheduled' | 'failed'
  tweetUrl?: string
  scheduledAt?: string
  error?: string
}

function PublishPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URLパラメータから下書きIDを取得
  const draftIds = searchParams.get('draftIds')?.split(',') || []
  const singleDraftId = searchParams.get('draftId')
  const allDraftIds = singleDraftId ? [singleDraftId] : draftIds

  const [drafts, setDrafts] = useState<Draft[]>([])
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set(allDraftIds))
  const [publishType, setPublishType] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState<PublishResult[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
    claudeLog.logFrontendAction('page-load', 'UnifiedPublishPage', { 
      draftIds: allDraftIds 
    })
  }, [])

  const fetchDrafts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/create/draft/list')
      if (!response.ok) throw new Error('下書きの取得に失敗しました')
      
      const data = await response.json()
      const draftList = data.drafts?.filter((d: Draft) => d.status === 'DRAFT') || []
      setDrafts(draftList)

      // URLパラメータで指定された下書きが存在しない場合の対応
      if (allDraftIds.length > 0) {
        const existingIds = draftList.map((d: Draft) => d.id)
        const validIds = allDraftIds.filter(id => existingIds.includes(id))
        setSelectedDrafts(new Set(validIds))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDraftToggle = (draftId: string) => {
    const newSelected = new Set(selectedDrafts)
    if (newSelected.has(draftId)) {
      newSelected.delete(draftId)
    } else {
      newSelected.add(draftId)
    }
    setSelectedDrafts(newSelected)
  }

  const handlePublish = async () => {
    if (selectedDrafts.size === 0) {
      setError('投稿する下書きを選択してください')
      return
    }

    if (publishType === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      setError('スケジュール投稿には日時の指定が必要です')
      return
    }

    setPublishing(true)
    setError(null)
    
    try {
      claudeLog.info(
        { module: 'frontend', operation: 'unified-publish' },
        '🚀 Starting unified publish',
        { 
          selectedCount: selectedDrafts.size, 
          publishType,
          scheduledAt: publishType === 'scheduled' ? `${scheduledDate}T${scheduledTime}` : null
        }
      )

      const scheduledAt = publishType === 'scheduled' 
        ? `${scheduledDate}T${scheduledTime}:00.000Z`
        : undefined

      const response = await fetch('/api/publish/post/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftIds: Array.from(selectedDrafts),
          publishType,
          scheduledAt,
          options: {
            addHashtags: true,
            optimizeTime: publishType === 'scheduled'
          }
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setResults(result.results)
        
        claudeLog.success(
          { module: 'frontend', operation: 'unified-publish' },
          '✅ Unified publish completed',
          result.summary
        )

        // 成功した投稿のURLを開く
        if (publishType === 'immediate') {
          const successfulPosts = result.results.filter((r: PublishResult) => r.tweetUrl)
          successfulPosts.forEach((post: PublishResult) => {
            if (post.tweetUrl) {
              window.open(post.tweetUrl, '_blank')
            }
          })
        }

        // 少し遅延してから下書き一覧を更新
        setTimeout(fetchDrafts, 1000)
      } else {
        throw new Error(result.error || '投稿処理に失敗しました')
      }
    } catch (err) {
      claudeLog.error(
        { module: 'frontend', operation: 'unified-publish' },
        '💥 Unified publish failed',
        err
      )
      setError(err instanceof Error ? err.message : '投稿エラーが発生しました')
    } finally {
      setPublishing(false)
    }
  }

  const getCharacterLabel = (characterId: string) => {
    switch (characterId) {
      case 'cardi-dare': return 'カーディ・ダーレ'
      case 'neutral': return 'ニュートラル'
      default: return characterId
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-8 h-8 text-purple-600" />
                統合投稿システム
              </h1>
              <p className="mt-1 text-gray-600">
                即時投稿とスケジュール投稿を統一管理
              </p>
            </div>
            <button
              onClick={fetchDrafts}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 下書き選択エリア */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                投稿する下書きを選択
              </h2>

              {drafts.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">投稿可能な下書きがありません</p>
                  <button
                    onClick={() => router.push('/create')}
                    className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    新しいコンテンツを作成
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => {
                    const isSelected = selectedDrafts.has(draft.id)
                    const tweetText = `${draft.content}\n\n${draft.hashtags.map(tag => `#${tag.replace(/^#/, '')}`).join(' ')}`
                    const charCount = tweetText.length
                    const isOverLimit = charCount > 280
                    
                    return (
                      <div
                        key={draft.id}
                        onClick={() => handleDraftToggle(draft.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isOverLimit ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleDraftToggle(draft.id)}
                                className="w-4 h-4 text-purple-600"
                                disabled={isOverLimit}
                              />
                              <h3 className="font-medium text-gray-900">
                                {draft.metadata?.conceptTitle || draft.title || '無題'}
                              </h3>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {getCharacterLabel(draft.characterId)}
                              </span>
                              {draft.metadata?.viralScore && (
                                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                                  スコア: {draft.metadata.viralScore}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                              {draft.content}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {draft.hashtags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="text-xs text-purple-600">
                                    #{tag.replace(/^#/, '')}
                                  </span>
                                ))}
                                {draft.hashtags.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{draft.hashtags.length - 3}個
                                  </span>
                                )}
                              </div>
                              <span className={`text-xs ${
                                isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-500'
                              }`}>
                                {charCount}/280文字
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 投稿設定エリア */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                投稿設定
              </h3>

              {/* 投稿タイプ選択 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  投稿タイプ
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="publishType"
                      value="immediate"
                      checked={publishType === 'immediate'}
                      onChange={(e) => setPublishType(e.target.value as 'immediate')}
                      className="text-purple-600"
                    />
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span>即時投稿</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="publishType"
                      value="scheduled"
                      checked={publishType === 'scheduled'}
                      onChange={(e) => setPublishType(e.target.value as 'scheduled')}
                      className="text-purple-600"
                    />
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>スケジュール投稿</span>
                  </label>
                </div>
              </div>

              {/* スケジュール設定 */}
              {publishType === 'scheduled' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    投稿日時
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* 選択状況 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">選択中</span>
                  <span className="text-sm text-gray-600">
                    {selectedDrafts.size}件
                  </span>
                </div>
                {selectedDrafts.size > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600">
                      {Array.from(selectedDrafts).map(id => {
                        const draft = drafts.find(d => d.id === id)
                        return draft?.metadata?.conceptTitle || draft?.title || id.slice(0, 8)
                      }).join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* エラー表示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <p className="ml-2 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* 投稿ボタン */}
              <button
                onClick={handlePublish}
                disabled={selectedDrafts.size === 0 || publishing}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    処理中...
                  </>
                ) : publishType === 'immediate' ? (
                  <>
                    <Send className="w-5 h-5" />
                    今すぐ投稿
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    スケジュール設定
                  </>
                )}
              </button>

              {/* 結果表示 */}
              {results.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    処理結果
                  </h4>
                  <div className="space-y-2">
                    {results.map((result, idx) => (
                      <div key={idx} className={`p-2 rounded text-sm ${
                        result.status === 'published' ? 'bg-green-50 text-green-700' :
                        result.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        <div className="flex items-center gap-1">
                          {result.status === 'published' ? <Check className="w-3 h-3" /> :
                           result.status === 'scheduled' ? <Clock className="w-3 h-3" /> :
                           <AlertCircle className="w-3 h-3" />}
                          <span className="font-medium">
                            {result.status === 'published' ? '投稿完了' :
                             result.status === 'scheduled' ? 'スケジュール設定' :
                             '失敗'}
                          </span>
                        </div>
                        {result.error && (
                          <p className="text-xs mt-1">{result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* おすすめ投稿時間 */}
              {publishType === 'scheduled' && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    おすすめ投稿時間
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• 7:00-9:00 通勤時間帯</li>
                    <li>• 12:00-13:00 ランチタイム</li>
                    <li>• 20:00-22:00 ゴールデンタイム</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => router.push('/drafts')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            下書き管理に戻る
          </button>
          <button
            onClick={() => router.push('/mission-control')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ダッシュボード
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UnifiedPublishPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    }>
      <PublishPageContent />
    </Suspense>
  )
}