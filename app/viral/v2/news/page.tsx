'use client'

import { useState, useEffect } from 'react'

interface NewsArticle {
  id: string
  url: string
  title: string
  summary: string
  source_domain: string
  published_date: string
  theme: string
  keywords: string[]
  session_ids: string[]
}

interface TrendingTopic {
  keyword: string
  mention_count: number
  source_diversity: number
  themes: string[]
}

export default function NewsDBPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [trends, setTrends] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [searchParams, setSearchParams] = useState({
    theme: '',
    keyword: '',
    days: 7
  })
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'sources'>('search')

  useEffect(() => {
    if (activeTab === 'search') {
      searchArticles()
    } else if (activeTab === 'trending') {
      fetchTrends()
    }
  }, [activeTab])

  const searchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchParams.theme) params.append('theme', searchParams.theme)
      if (searchParams.keyword) params.append('keyword', searchParams.keyword)
      params.append('startDate', new Date(Date.now() - searchParams.days * 24 * 60 * 60 * 1000).toISOString())
      
      const response = await fetch(`/api/viral/v2/news?action=search&${params}`)
      const data = await response.json()
      setArticles(data.articles || [])
    } catch (error) {
      console.error('Failed to search articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/viral/v2/news?action=trending&days=${searchParams.days}`)
      const data = await response.json()
      setTrends(data.trends || [])
    } catch (error) {
      console.error('Failed to fetch trends:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">ニュースデータベース</h1>
      
      {/* タブ */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            記事検索
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trending'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            トレンド分析
          </button>
        </nav>
      </div>

      {/* 検索フィルタ */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">テーマ</label>
            <input
              type="text"
              value={searchParams.theme}
              onChange={(e) => setSearchParams({ ...searchParams, theme: e.target.value })}
              placeholder="例: AIと働き方"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
            <input
              type="text"
              value={searchParams.keyword}
              onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
              placeholder="検索キーワード"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期間</label>
            <select
              value={searchParams.days}
              onChange={(e) => setSearchParams({ ...searchParams, days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={1}>過去24時間</option>
              <option value={3}>過去3日間</option>
              <option value={7}>過去7日間</option>
              <option value={30}>過去30日間</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={activeTab === 'search' ? searchArticles : fetchTrends}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              検索
            </button>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      ) : (
        <>
          {/* 記事一覧 */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-2">
                {articles.length}件の記事
              </div>
              {articles.map((article) => (
                <div key={article.id} className="bg-white p-4 rounded shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold">
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {article.title}
                      </a>
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatDate(article.published_date)}
                    </span>
                  </div>
                  
                  {article.summary && (
                    <p className="text-sm text-gray-600 mb-2">{article.summary}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>ソース: {article.source_domain}</span>
                    <span>テーマ: {article.theme}</span>
                    {article.keywords && article.keywords.length > 0 && (
                      <span>
                        キーワード: {article.keywords.slice(0, 3).join(', ')}
                        {article.keywords.length > 3 && '...'}
                      </span>
                    )}
                  </div>
                  
                  {article.session_ids && article.session_ids.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400">
                      {article.session_ids.length}個のセッションで使用
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* トレンド分析 */}
          {activeTab === 'trending' && (
            <div className="bg-white rounded shadow">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      キーワード
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      言及回数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ソース数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      関連テーマ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trends.map((trend, index) => (
                    <tr key={trend.keyword}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trend.keyword}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trend.mention_count}回
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trend.source_diversity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {trend.themes.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}