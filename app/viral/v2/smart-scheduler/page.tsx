'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SmartRTScheduler, RT_STRATEGIES } from '@/lib/smart-rt-scheduler'
import { format, addHours, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Post {
  id: string
  content: string
  postedAt: string
  type: 'viral' | 'cot' | 'news'
  draftId?: string
  characterId?: string
}

interface ScheduledItem {
  id: string
  type: 'post' | 'rt'
  content: string
  scheduledAt: Date
  rtStrategy?: string
  addComment?: boolean
  commentText?: string
}

function SmartSchedulerContent() {
  const searchParams = useSearchParams()
  const postId = searchParams.get('postId')
  const draftId = searchParams.get('draftId')
  const type = searchParams.get('type') as 'viral' | 'cot' | 'news'
  
  const [post, setPost] = useState<Post | null>(null)
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(['6h_spike'])
  const [customComment, setCustomComment] = useState('')
  const [useCharacterComment, setUseCharacterComment] = useState(true)
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
  const [loading, setLoading] = useState(false)
  
  const scheduler = new SmartRTScheduler()
  
  useEffect(() => {
    if (postId) {
      fetchPost()
    } else {
      generateMockPost()
    }
  }, [postId])
  
  const fetchPost = async () => {
    // TODO: 実際の投稿を取得
    generateMockPost()
  }
  
  const generateMockPost = () => {
    setPost({
      id: postId || 'mock-' + Date.now(),
      content: 'AIが私たちの働き方を根本から変える時代。リモートワークの次に来るのは「AI協働」という新しいワークスタイル。人間の創造性とAIの効率性が融合することで、想像もしなかった価値が生まれる。#AI #働き方改革 #未来の仕事',
      postedAt: new Date().toISOString(),
      type: type || 'viral',
      draftId,
      characterId: 'cardi-dare'
    })
    
    updatePreview()
  }
  
  const updatePreview = () => {
    if (!post) return
    
    const now = new Date()
    const items: ScheduledItem[] = []
    
    // 通常の投稿を追加
    items.push({
      id: 'original',
      type: 'post',
      content: post.content,
      scheduledAt: now
    })
    
    // 選択されたRT戦略を適用
    selectedStrategies.forEach(strategyId => {
      const strategy = RT_STRATEGIES.find(s => s.id === strategyId)
      if (!strategy) return
      
      const rtTime = scheduler.calculateOptimalRTTime(now, strategy.hoursAfter)
      
      items.push({
        id: `rt-${strategyId}`,
        type: 'rt',
        content: post.content,
        scheduledAt: rtTime,
        rtStrategy: strategyId,
        addComment: strategy.addComment,
        commentText: strategy.addComment ? getCommentText(strategy) : undefined
      })
    })
    
    setScheduledItems(items.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()))
  }
  
  const getCommentText = (strategy: any) => {
    if (!useCharacterComment || !customComment) {
      // デフォルトコメントを生成
      switch (strategy.commentType) {
        case 'update':
          return '【続報】この件について新しい動きがありました👇'
        case 'question':
          return 'みなさんはこの件についてどう思いますか？意見を聞かせてください💭'
        case 'character':
          return 'まあ、しかたねえだろ。時代はこうやって変わっていくんだから。'
        default:
          return 'まだまだ多くの方に見ていただきたい内容です。'
      }
    }
    return customComment
  }
  
  const handleSchedule = async () => {
    if (!post || selectedStrategies.length === 0) return
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/viral/v2/scheduler/rt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          originalContent: post.content,
          strategies: selectedStrategies,
          draftId: post.draftId,
          draftType: post.type,
          characterId: useCharacterComment ? post.characterId : undefined,
          customComment: customComment || undefined
        })
      })
      
      if (response.ok) {
        alert('RTスケジュールを作成しました！')
        // TODO: リダイレクト
      } else {
        alert('スケジュール作成に失敗しました')
      }
    } catch (error) {
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    updatePreview()
  }, [selectedStrategies, customComment, useCharacterComment])
  
  if (!post) {
    return <div className="p-8 text-center">読み込み中...</div>
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">スマートRTスケジューラー</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側：設定 */}
          <div className="space-y-6">
            {/* 元の投稿 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">元の投稿</h2>
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  投稿時刻: {format(new Date(post.postedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                </p>
              </div>
            </div>
            
            {/* RT戦略選択 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">RT戦略</h2>
              <div className="space-y-3">
                {RT_STRATEGIES.map(strategy => (
                  <label key={strategy.id} className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStrategies.includes(strategy.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStrategies([...selectedStrategies, strategy.id])
                        } else {
                          setSelectedStrategies(selectedStrategies.filter(s => s !== strategy.id))
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{strategy.name}</p>
                      <p className="text-sm text-gray-600">{strategy.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {strategy.hoursAfter}時間後 • {strategy.addComment ? 'コメント付き' : 'コメントなし'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* コメント設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">コメント設定</h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useCharacterComment}
                    onChange={(e) => setUseCharacterComment(e.target.checked)}
                  />
                  <span className="text-sm">
                    カーディ・ダーレのキャラクターでコメント
                  </span>
                </label>
                
                {!useCharacterComment && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      カスタムコメント
                    </label>
                    <textarea
                      value={customComment}
                      onChange={(e) => setCustomComment(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={3}
                      placeholder="RTに追加するコメントを入力..."
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* アクションボタン */}
            <div className="flex space-x-4">
              <button
                onClick={handleSchedule}
                disabled={loading || selectedStrategies.length === 0}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'スケジュール中...' : 'RTをスケジュール'}
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
          
          {/* 右側：プレビュー */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">スケジュールプレビュー</h2>
              
              {/* タイムライン表示 */}
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div className="space-y-6">
                  {scheduledItems.map((item, index) => (
                    <div key={item.id} className="relative flex items-start">
                      <div className={`absolute left-8 w-4 h-4 rounded-full -translate-x-1/2 ${
                        item.type === 'post' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></div>
                      
                      <div className="ml-16 flex-1">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.type === 'post' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {item.type === 'post' ? '投稿' : 'RT'}
                            </span>
                            <span className="text-sm text-gray-600">
                              {format(item.scheduledAt, 'MM/dd HH:mm', { locale: ja })}
                            </span>
                          </div>
                          
                          {item.type === 'rt' && (
                            <div className="mb-2">
                              <span className="text-xs text-gray-500">
                                戦略: {RT_STRATEGIES.find(s => s.id === item.rtStrategy)?.name}
                              </span>
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {item.content}
                          </p>
                          
                          {item.commentText && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">コメント:</p>
                              <p className="text-sm text-gray-700">
                                {item.commentText}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {index < scheduledItems.length - 1 && (
                          <div className="mt-2 text-center">
                            <span className="text-xs text-gray-500">
                              {(() => {
                                const diff = scheduledItems[index + 1].scheduledAt.getTime() - item.scheduledAt.getTime()
                                const hours = Math.floor(diff / (1000 * 60 * 60))
                                const days = Math.floor(hours / 24)
                                
                                if (days > 0) {
                                  return `${days}日後`
                                } else {
                                  return `${hours}時間後`
                                }
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 推奨事項 */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  💡 推奨事項
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 6時間後のRTはエンゲージメントの再活性化に効果的</li>
                  <li>• 深夜時間帯は自動的に翌朝に調整されます</li>
                  <li>• 週末は少し遅めの時間に設定されます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SmartSchedulerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>}>
      <SmartSchedulerContent />
    </Suspense>
  )
}