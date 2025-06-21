'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

interface PostPlan {
  type: 'quote_rt' | 'comment_rt' | 'original' | 'news_thread'
  scheduledTime: string
  targetPost?: {
    id: string
    url: string
    author: string
    content: string
  }
  newsArticle?: {
    id: string
    title: string
    summary: string
    url: string
  }
  theme?: string
  suggestedContent: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  expectedEngagement: number
}

interface PlanResponse {
  success: boolean
  date: string
  totalPosts: number
  plan: PostPlan[]
  breakdown: {
    quoteRT: number
    commentRT: number
    original: number
    newsThread: number
  }
}

export default function PlanPage() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState<PlanResponse | null>(null)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [targetCount, setTargetCount] = useState(15)
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())

  const generatePlan = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/publish/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCount,
          date: selectedDate
        })
      })

      if (res.ok) {
        const data = await res.json()
        setPlan(data)
        setSelectedPosts(new Set()) // リセット
      } else {
        alert('計画生成に失敗しました')
      }
    } catch (error) {
      console.error('Plan generation error:', error)
      alert('計画生成でエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectPost = (index: number) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedPosts.size === plan?.plan.length) {
      setSelectedPosts(new Set())
    } else {
      setSelectedPosts(new Set(plan?.plan.map((_, i) => i) || []))
    }
  }

  const scheduleSelected = async () => {
    if (selectedPosts.size === 0) {
      alert('投稿を選択してください')
      return
    }

    const selectedPlans = plan?.plan.filter((_, i) => selectedPosts.has(i)) || []
    
    try {
      const res = await fetch('/api/publish/schedule/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: selectedPlans })
      })
      
      if (res.ok) {
        const data = await res.json()
        alert(`${data.created}件の投稿をスケジュールに追加しました`)
        setSelectedPosts(new Set()) // 選択をリセット
      } else {
        alert('スケジュール追加に失敗しました')
      }
    } catch (error) {
      console.error('Schedule error:', error)
      alert('スケジュール追加でエラーが発生しました')
    }
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      quote_rt: '🔄',
      comment_rt: '💬',
      original: '✨',
      news_thread: '📰'
    }
    return icons[type as keyof typeof icons] || '📝'
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      quote_rt: '引用RT',
      comment_rt: 'コメントRT',
      original: '独自投稿',
      news_thread: 'ニュース'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600 bg-red-50',
      medium: 'text-yellow-600 bg-yellow-50',
      low: 'text-gray-600 bg-gray-50'
    }
    return colors[priority as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">投稿計画</h1>
            <p className="mt-1 text-sm text-gray-600">
              AIが1日の投稿計画を自動生成します
            </p>
          </div>

          {/* 計画生成コントロール */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  計画日
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目標投稿数
                </label>
                <select
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={10}>10件</option>
                  <option value={15}>15件（推奨）</option>
                  <option value={20}>20件</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end gap-3">
                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {generating ? '生成中...' : '計画を生成'}
                </button>
                {plan && (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      {selectedPosts.size === plan.plan.length ? '選択解除' : '全選択'}
                    </button>
                    <button
                      onClick={scheduleSelected}
                      disabled={selectedPosts.size === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      選択した{selectedPosts.size}件をスケジュール
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 計画サマリー */}
          {plan && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">計画サマリー</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{plan.breakdown.quoteRT}</div>
                  <div className="text-sm text-gray-600">引用RT</div>
                </div>
                <div className="p-3 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">{plan.breakdown.commentRT}</div>
                  <div className="text-sm text-gray-600">コメントRT</div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{plan.breakdown.original}</div>
                  <div className="text-sm text-gray-600">独自投稿</div>
                </div>
                <div className="p-3 bg-orange-50 rounded">
                  <div className="text-2xl font-bold text-orange-600">{plan.breakdown.newsThread}</div>
                  <div className="text-sm text-gray-600">ニュース</div>
                </div>
              </div>
            </div>
          )}

          {/* 投稿計画リスト */}
          {plan && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="font-semibold text-gray-900">
                  投稿スケジュール（{plan.date}）
                </h3>
              </div>
              <div className="divide-y">
                {plan.plan.map((post, index) => (
                  <div 
                    key={index} 
                    className={`p-6 hover:bg-gray-50 ${selectedPosts.has(index) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* チェックボックス */}
                      <input
                        type="checkbox"
                        checked={selectedPosts.has(index)}
                        onChange={() => handleSelectPost(index)}
                        className="mt-1"
                      />
                      
                      {/* 時間とタイプ */}
                      <div className="flex-shrink-0 text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(post.scheduledTime)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xl">{getTypeIcon(post.type)}</span>
                          <span className="text-sm text-gray-600">
                            {getTypeLabel(post.type)}
                          </span>
                        </div>
                      </div>
                      
                      {/* コンテンツ */}
                      <div className="flex-1">
                        {/* 参照元 */}
                        {post.targetPost && (
                          <div className="mb-2 p-3 bg-gray-100 rounded text-sm">
                            <div className="font-semibold">@{post.targetPost.author}</div>
                            <div className="text-gray-600 line-clamp-2">
                              {post.targetPost.content}
                            </div>
                          </div>
                        )}
                        
                        {post.newsArticle && (
                          <div className="mb-2 p-3 bg-gray-100 rounded text-sm">
                            <div className="font-semibold">{post.newsArticle.title}</div>
                            <div className="text-gray-600 line-clamp-2">
                              {post.newsArticle.summary}
                            </div>
                          </div>
                        )}
                        
                        {/* 提案内容 */}
                        <div className="p-4 bg-blue-50 rounded">
                          <p className="whitespace-pre-wrap">{post.suggestedContent}</p>
                        </div>
                        
                        {/* メタ情報 */}
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className={`px-2 py-1 rounded ${getPriorityColor(post.priority)}`}>
                            {post.priority === 'high' ? '優先度高' : 
                             post.priority === 'medium' ? '優先度中' : '優先度低'}
                          </span>
                          <span className="text-gray-600">
                            理由: {post.reasoning}
                          </span>
                          <span className="text-gray-600">
                            予想エンゲージメント: {(post.expectedEngagement * 100).toFixed(1)}%
                          </span>
                        </div>
                        
                        {/* アクション */}
                        <div className="mt-3 flex gap-2">
                          <Link
                            href={`/create?content=${encodeURIComponent(post.suggestedContent)}`}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            編集
                          </Link>
                          {post.targetPost && (
                            <a
                              href={post.targetPost.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                            >
                              元投稿
                            </a>
                          )}
                          {post.newsArticle && (
                            <a
                              href={post.newsArticle.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                            >
                              元記事
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}