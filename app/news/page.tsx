'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'

interface NewsSource {
  id: string
  name: string
  url: string
  type: string
  category: string
  active: boolean
  _count: {
    articles: number
  }
}

interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  publishedAt: string
  category: string
  processed: boolean
  importance: number | null
  metadata?: any
  source: {
    name: string
  }
}

export default function NewsPage() {
  const [sources, setSources] = useState<NewsSource[]>([])
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [activeTab, setActiveTab] = useState<'sources' | 'articles'>('articles')

  useEffect(() => {
    fetchSources()
    fetchArticles()
  }, [selectedDate])

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/news/sources')
      const data = await res.json()
      setSources(data)
    } catch (error) {
      console.error('Error fetching sources:', error)
    }
  }

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDate) params.append('date', selectedDate)
      
      const res = await fetch(`/api/news/articles?${params}`)
      const data = await res.json()
      setArticles(data.articles)
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCollect = async (type: 'news' | 'twitter' = 'news') => {
    setCollecting(true)
    try {
      const endpoint = type === 'twitter' ? '/api/news/collect-twitter' : '/api/news/collect'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(data.message)
        fetchArticles()
        fetchSources()
      } else {
        alert('収集中にエラーが発生しました')
      }
    } catch (error) {
      console.error('Error collecting news:', error)
      alert('収集中にエラーが発生しました')
    } finally {
      setCollecting(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/news/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchAnalyze: true }),
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(`${data.analyzed}件の記事を分析しました`)
        fetchArticles()
      } else {
        alert('分析中にエラーが発生しました')
      }
    } catch (error) {
      console.error('Error analyzing news:', error)
      alert('分析中にエラーが発生しました')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerateThread = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/news/generate-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: selectedDate || new Date().toISOString().split('T')[0],
          limit: 10 
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(`スレッドを生成しました：${data.title}`)
        // スレッド管理画面へ遷移するか、モーダルで表示
      } else {
        alert(data.error || 'スレッド生成中にエラーが発生しました')
      }
    } catch (error) {
      console.error('Error generating thread:', error)
      alert('スレッド生成中にエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">AIニュース管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              AI関連のニュースを収集・管理します
            </p>
          </div>

          {/* タブ切り替え */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex bg-white rounded-lg shadow-sm">
              <button
                onClick={() => setActiveTab('articles')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  activeTab === 'articles' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                記事一覧
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  activeTab === 'sources' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                ソース管理
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCollect('news')}
                disabled={collecting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {collecting ? '収集中...' : 'ニュース収集'}
              </button>
              <button
                onClick={() => handleCollect('twitter')}
                disabled={collecting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {collecting ? '収集中...' : 'Twitter収集'}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                {analyzing ? '分析中...' : 'AI分析実行'}
              </button>
              <button
                onClick={handleGenerateThread}
                disabled={generating || articles.filter(a => a.processed && a.importance !== null).length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {generating ? '生成中...' : 'スレッド生成'}
              </button>
            </div>
          </div>

          {activeTab === 'articles' ? (
            <>
              {/* 日付フィルター */}
              <div className="mb-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 記事一覧 */}
              {loading ? (
                <div className="text-center py-8">読み込み中...</div>
              ) : articles.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">記事がありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div key={article.id} className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-gray-600 mb-3">{article.summary}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{article.source.name}</span>
                            <span>{formatDate(article.publishedAt)}</span>
                            {article.processed && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                処理済み
                              </span>
                            )}
                            {article.importance !== null && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                重要度: {(article.importance * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {article.metadata?.analysis && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                              <p className="text-gray-700">
                                {article.metadata.analysis.japaneseSummary || article.metadata.analysis.summary}
                              </p>
                              {article.metadata.analysis.keyPoints && article.metadata.analysis.keyPoints.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-gray-600">
                                  {article.metadata.analysis.keyPoints.map((point: string, index: number) => (
                                    <li key={index}>{point}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                        >
                          記事を読む
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ソース管理 */
            <div className="space-y-4">
              {sources.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">ソースがありません</p>
                </div>
              ) : (
                sources.map((source) => (
                  <div key={source.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {source.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {source.url}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {source.type}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                            {source.category}
                          </span>
                          <span className="text-gray-500">
                            記事数: {source._count.articles}
                          </span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded text-sm ${
                        source.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {source.active ? '有効' : '無効'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}