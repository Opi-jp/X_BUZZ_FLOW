'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TopicPool {
  theme: string
  sessionCount: number
  latestSessionId: string
  lastUpdated: string
  isFresh: boolean
  topics: any[]
}

interface Analysis {
  topKeywords: Array<{ keyword: string; count: number }>
  topSources: Array<{ source: string; count: number }>
  totalTopics: number
}

export default function DataPoolPage() {
  const [pools, setPools] = useState<TopicPool[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  useEffect(() => {
    fetchPools()
    fetchAnalysis()
  }, [])

  const fetchPools = async () => {
    try {
      // 各テーマの最新トピックプールを取得
      const themes = ['AIと働き方', 'AIとビジネス', 'AI技術']
      const poolData = await Promise.all(
        themes.map(async (theme) => {
          const response = await fetch(`/api/viral/v2/topics/pool?theme=${encodeURIComponent(theme)}`)
          const data = await response.json()
          return {
            theme,
            ...data
          }
        })
      )
      
      setPools(poolData.filter(p => p.available))
    } catch (error) {
      console.error('Failed to fetch pools:', error)
    }
  }

  const fetchAnalysis = async () => {
    try {
      const response = await fetch('/api/viral/v2/topics/analyze?days=7')
      const data = await response.json()
      setAnalysis(data)
    } catch (error) {
      console.error('Failed to fetch analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFreshness = async (theme: string) => {
    const response = await fetch('/api/viral/v2/topics/pool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ theme })
    })
    const data = await response.json()
    alert(data.needsRefresh 
      ? `${theme}のトピックは更新が必要です（${data.hoursAgo || 0}時間前）` 
      : `${theme}のトピックは新鮮です（${data.hoursAgo || 0}時間前）`
    )
  }

  const createSessionWithData = async (pool: TopicPool) => {
    const response = await fetch('/api/viral/v2/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        theme: pool.theme,
        platform: 'Twitter',
        style: '洞察的'
      })
    })
    
    const { session } = await response.json()
    
    // トピックを再利用
    await fetch(`/api/viral/v2/sessions/${session.id}/collect-topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reuseTopics: true })
    })
    
    window.location.href = `/viral/v2/sessions/${session.id}`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">データプールを読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">データプール管理</h1>
        <p className="text-gray-600">
          収集済みのトピックやコンセプトを再利用して、効率的にコンテンツを生成できます
        </p>
      </div>

      {/* トピックプール */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">利用可能なトピックプール</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <div key={pool.theme} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">{pool.theme}</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  最終更新: {pool.freshness?.hoursAgo || 0}時間前
                </p>
                <p className="text-gray-600">
                  利用回数: {pool.usageCount}回
                </p>
                <p className={`font-medium ${pool.freshness?.isFresh ? 'text-green-600' : 'text-orange-600'}`}>
                  {pool.freshness?.isFresh ? '✓ 新鮮' : '⚠ 更新推奨'}
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => createSessionWithData(pool)}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm"
                >
                  このデータで新規セッション作成
                </button>
                <button
                  onClick={() => checkFreshness(pool.theme)}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm"
                >
                  鮮度チェック
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分析結果 */}
      {analysis && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">トピック分析（過去7日間）</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">頻出キーワード Top10</h3>
              <div className="space-y-2">
                {analysis.topKeywords.slice(0, 10).map((item, index) => (
                  <div key={item.keyword} className="flex justify-between items-center">
                    <span className="text-sm">{index + 1}. {item.keyword}</span>
                    <span className="text-sm text-gray-500">{item.count}回</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">主要ソース</h3>
              <div className="space-y-2">
                {analysis.topSources.slice(0, 10).map((item, index) => (
                  <div key={item.source} className="flex justify-between items-center">
                    <span className="text-sm truncate mr-2">{item.source}</span>
                    <span className="text-sm text-gray-500">{item.count}回</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            合計 {analysis.totalTopics} トピック収集済み
          </div>
        </div>
      )}

      {/* セッション復旧 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">セッション復旧・再開</h2>
        <p className="text-gray-600 mb-4">
          エラーで中断したセッションがある場合、前のフェーズの結果を再利用して続きから再開できます
        </p>
        <Link href="/viral/v2/sessions">
          <button className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700">
            セッション一覧へ
          </button>
        </Link>
      </div>
    </div>
  )
}