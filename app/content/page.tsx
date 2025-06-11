'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type TabType = 'collected' | 'draft' | 'scheduled' | 'posted'

interface Content {
  id: string
  type: 'buzz' | 'original' | 'news'
  content: string
  author?: string
  likesCount?: number
  scheduledTime?: string
  status: string
  perplexityScore?: number
  createdAt: string
}

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<TabType>('collected')
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadContents(activeTab)
  }, [activeTab])

  const loadContents = async (tab: TabType) => {
    setLoading(true)
    try {
      let endpoint = ''
      switch (tab) {
        case 'collected':
          endpoint = '/api/buzz-posts?limit=20'
          break
        case 'scheduled':
          endpoint = '/api/scheduled-posts?status=SCHEDULED'
          break
        case 'posted':
          endpoint = '/api/scheduled-posts?status=POSTED'
          break
        case 'draft':
          endpoint = '/api/scheduled-posts?status=DRAFT'
          break
      }

      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        const items = data.posts || data.scheduledPosts || []
        
        // データを統一フォーマットに変換
        const formattedContents = items.map((item: any) => ({
          id: item.id,
          type: item.postType === 'QUOTE' ? 'buzz' : 'original',
          content: item.content,
          author: item.authorUsername,
          likesCount: item.likesCount,
          scheduledTime: item.scheduledTime,
          status: item.status || 'collected',
          perplexityScore: item.likesCount ? Math.min(95, 50 + Math.log10(item.likesCount) * 10) : 0,
          createdAt: item.createdAt || item.collectedAt
        }))
        
        setContents(formattedContents)
      }
    } catch (error) {
      console.error('Error loading contents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickRP = async (contentId: string) => {
    // RP作成画面に遷移
    window.location.href = `/create?refId=${contentId}&type=rp`
  }

  const handleSchedule = async (contentId: string) => {
    // スケジュール設定
    const time = prompt('投稿時間を入力 (例: 19:00)')
    if (time) {
      alert(`${time}に投稿予定として設定しました`)
      // TODO: API呼び出し
    }
  }

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'collected', label: '収集済み', icon: '📥' },
    { key: 'draft', label: '下書き', icon: '📝' },
    { key: 'scheduled', label: '予定', icon: '📅' },
    { key: 'posted', label: '投稿済み', icon: '✅' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">📝 コンテンツ管理</h1>
        <p className="mt-2 text-gray-600">
          収集・作成・投稿を一元管理
        </p>
      </div>

      {/* タブ */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              <span className="ml-2 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                {contents.length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* コンテンツリスト */}
      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <div className="space-y-4">
          {contents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {activeTab === 'collected' && (
                <>
                  <p>収集されたコンテンツがありません</p>
                  <Link href="/morning" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
                    朝の準備で収集を実行 →
                  </Link>
                </>
              )}
              {activeTab === 'draft' && <p>下書きがありません</p>}
              {activeTab === 'scheduled' && <p>予定投稿がありません</p>}
              {activeTab === 'posted' && <p>投稿済みコンテンツがありません</p>}
            </div>
          ) : (
            contents.map((content) => (
              <div key={content.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Perplexityスコア */}
                    {content.perplexityScore && content.perplexityScore > 80 && (
                      <div className="inline-flex items-center bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mb-2">
                        🔥 Perplexity推奨 {content.perplexityScore}%
                      </div>
                    )}
                    
                    {/* 著者情報 */}
                    {content.author && (
                      <p className="text-sm font-medium text-gray-600">
                        @{content.author}
                        {content.likesCount && (
                          <span className="ml-2 text-gray-500">
                            {content.likesCount.toLocaleString()}いいね
                          </span>
                        )}
                      </p>
                    )}
                    
                    {/* コンテンツ本文 */}
                    <p className="mt-2 text-sm">{content.content}</p>
                    
                    {/* スケジュール情報 */}
                    {content.scheduledTime && (
                      <p className="mt-2 text-xs text-gray-500">
                        投稿予定: {new Date(content.scheduledTime).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                  
                  {/* アクションボタン */}
                  <div className="ml-4 flex flex-col gap-2">
                    {activeTab === 'collected' && (
                      <>
                        <button
                          onClick={() => handleQuickRP(content.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          RP作成
                        </button>
                        <button
                          onClick={() => handleSchedule(content.id)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        >
                          予約
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'draft' && (
                      <>
                        <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                          投稿
                        </button>
                        <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
                          編集
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'scheduled' && (
                      <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
                        編集
                      </button>
                    )}
                    
                    {activeTab === 'posted' && (
                      <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                        分析
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* フローティングアクションボタン */}
      <div className="fixed bottom-8 right-8">
        <Link
          href="/create"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>
    </div>
  )
}