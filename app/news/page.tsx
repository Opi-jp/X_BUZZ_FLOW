'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { formatDateTimeJST } from '@/lib/date-utils'

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

function NewsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sources, setSources] = useState<NewsSource[]>([])
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [collectingType, setCollectingType] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || '')
  const [activeTab, setActiveTab] = useState<'sources' | 'articles'>(
    (searchParams.get('tab') as 'sources' | 'articles') || 'articles'
  )
  const [threadLimit, setThreadLimit] = useState(10)
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [analyzingArticles, setAnalyzingArticles] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSources()
    fetchArticles()
  }, [selectedDate])

  // URLパラメータを更新
  const updateURL = (newDate?: string, newTab?: string) => {
    const params = new URLSearchParams()
    if (newDate !== undefined ? newDate : selectedDate) {
      params.set('date', newDate !== undefined ? newDate : selectedDate)
    }
    if (newTab || activeTab !== 'articles') {
      params.set('tab', newTab || activeTab)
    }
    router.push(`/news?${params.toString()}`)
  }

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

  const handleCollect = async (type: 'news' | 'twitter' | 'jp' | 'ai-tweets' | 'test' | 'rss' | 'all' | 'simple' = 'news') => {
    setCollectingType(type)
    try {
      let endpoint = ''
      switch (type) {
        case 'news':
          endpoint = '/api/news/collect'
          break
        case 'twitter':
          endpoint = '/api/news/collect-twitter'
          break
        case 'jp':
          endpoint = '/api/news/collect-jp'
          break
        case 'ai-tweets':
          endpoint = '/api/news/collect-ai-tweets'
          break
        case 'test':
          endpoint = '/api/news/test-sources'
          break
        case 'rss':
          endpoint = '/api/news/collect-rss'
          break
        case 'all':
          endpoint = '/api/news/collect-all'
          break
        case 'simple':
          endpoint = '/api/news/collect-simple'
          break
        default:
          alert('不明な収集タイプです')
          return
      }
      
      console.log(`収集タイプ: ${type}, エンドポイント: ${endpoint}`)
      
      const res = await fetch(endpoint, {
        method: type === 'test' ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: type === 'test' ? undefined : JSON.stringify({}),
      })

      const data = await res.json()
      
      if (res.ok) {
        let message = data.message || `${data.saved || 0}件保存しました`
        
        // collect-allの詳細結果を表示
        if (type === 'all' && data.results) {
          const details = []
          if (data.results.rss) {
            details.push(`RSS: ${data.results.rss.saved}件保存${data.results.rss.error ? ' (エラー: ' + data.results.rss.error + ')' : ''}`)
          }
          if (data.results.aiTweets) {
            details.push(`Twitter: ${data.results.aiTweets.saved}件保存${data.results.aiTweets.error ? ' (エラー: ' + data.results.aiTweets.error + ')' : ''}`)
          }
          if (details.length > 0) {
            message += '\n\n詳細:\n' + details.join('\n')
          }
        }
        
        alert(message)
        fetchArticles()
        fetchSources()
      } else {
        console.error('Collection error:', data)
        let errorMessage = data.error || '収集中にエラーが発生しました'
        
        if (data.details) {
          errorMessage += '\n\n詳細: ' + data.details
        }
        
        // APIキーエラーの場合は設定を促す
        if (res.status === 500 && data.details?.includes('環境変数が設定されていません')) {
          errorMessage += '\n\n環境変数を設定してください。'
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error collecting news:', error)
      alert('収集中にエラーが発生しました')
    } finally {
      setCollectingType(null)
    }
  }

  const handleAnalyze = async (forceReanalyze = false) => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/news/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchAnalyze: true, forceReanalyze }),
      })

      const data = await res.json()
      
      if (res.ok) {
        alert(`${data.analyzed}件の記事を${forceReanalyze ? '再' : ''}分析しました`)
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

  const handleAnalyzeSingle = async (articleId: string) => {
    setAnalyzingArticles(prev => new Set([...prev, articleId]))
    try {
      const res = await fetch('/api/news/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      })

      const data = await res.json()
      
      if (res.ok) {
        // 記事リストを更新
        fetchArticles()
      } else {
        alert(`記事の分析中にエラーが発生しました: ${data.error || '不明なエラー'}`)
      }
    } catch (error) {
      console.error('Error analyzing article:', error)
      alert('記事の分析中にエラーが発生しました')
    } finally {
      setAnalyzingArticles(prev => {
        const newSet = new Set(prev)
        newSet.delete(articleId)
        return newSet
      })
    }
  }

  const handleGenerateThread = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/news/generate-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: selectedDate || new Date().toISOString(),
          limit: threadLimit,
          timeRange: 48, // 過去48時間に拡大
          requiredArticleIds: Array.from(selectedArticles) // 選択された記事
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        // スレッド内容を整形して表示
        let threadContent = `スレッドを生成しました！\n\n【${data.title}】\n\n`
        threadContent += `メインツイート:\n${data.mainTweet}\n\n`
        
        if (data.newsItems && data.newsItems.length > 0) {
          threadContent += `ニュース一覧:\n`
          data.newsItems.forEach((item: any, index: number) => {
            threadContent += `\n${index + 1}. ${item.tweetContent || ''}【※ニュース内容】\n`
          })
        }
        
        alert(threadContent)
        
        // スレッド管理画面へ遷移
        router.push('/news/threads')
      } else {
        console.error('Thread generation failed:', data)
        const errorMessage = data.details ? `${data.error}\n\n詳細: ${data.details}` : (data.error || 'スレッド生成中にエラーが発生しました')
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error generating thread:', error)
      alert('スレッド生成中にエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return formatDateTimeJST(dateString)
  }

  const handleArticleToggle = (articleId: string) => {
    const newSelected = new Set(selectedArticles)
    if (newSelected.has(articleId)) {
      newSelected.delete(articleId)
    } else {
      newSelected.add(articleId)
    }
    setSelectedArticles(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedArticles.size === articles.filter(a => a.processed && a.importance !== null).length) {
      setSelectedArticles(new Set())
    } else {
      const allProcessedIds = articles
        .filter(a => a.processed && a.importance !== null)
        .map(a => a.id)
      setSelectedArticles(new Set(allProcessedIds))
    }
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
                onClick={() => {
                  setActiveTab('articles')
                  updateURL(selectedDate, 'articles')
                }}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  activeTab === 'articles' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                記事一覧
              </button>
              <button
                onClick={() => {
                  setActiveTab('sources')
                  updateURL(selectedDate, 'sources')
                }}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  activeTab === 'sources' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                ソース管理
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleCollect('rss')}
                disabled={collectingType !== null}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {collectingType === 'rss' ? '収集中...' : 'RSS収集'}
              </button>
              <button
                onClick={() => handleCollect('ai-tweets')}
                disabled={collectingType !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {collectingType === 'ai-tweets' ? '収集中...' : 'Twitter収集'}
              </button>
              <button
                onClick={() => handleCollect('all')}
                disabled={collectingType !== null}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {collectingType === 'all' ? '収集中...' : '一括収集'}
              </button>
              <div className="w-full sm:w-auto flex-1"></div>
              <button
                onClick={() => {
                  const unprocessedCount = articles.filter(a => !a.processed).length
                  if (unprocessedCount === 0 && articles.length > 0) {
                    if (confirm('すべての記事が分析済みです。全記事を再分析しますか？')) {
                      handleAnalyze(true)
                    }
                  } else {
                    handleAnalyze(false)
                  }
                }}
                disabled={analyzing || articles.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                title={`全記事: ${articles.length}件 (未処理: ${articles.filter(a => !a.processed).length}件)`}
              >
                {analyzing ? '一括分析中...' : 
                 articles.filter(a => !a.processed).length > 0 ? 
                   `未処理を一括分析 (${articles.filter(a => !a.processed).length}件)` : 
                   `全記事を再分析 (${articles.length}件)`
                }
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={threadLimit}
                  onChange={(e) => setThreadLimit(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="生成する記事数を選択"
                >
                  <option value={5}>TOP 5</option>
                  <option value={10}>TOP 10</option>
                  <option value={15}>TOP 15</option>
                  <option value={20}>TOP 20</option>
                  <option value={25}>TOP 25</option>
                  <option value={30}>TOP 30</option>
                </select>
                <button
                  onClick={handleGenerateThread}
                  disabled={generating || articles.filter(a => a.processed && a.importance !== null).length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                  title="分析済みニュースからトップ記事を選出"
                >
                  {generating ? '生成中...' : 'ニュース生成'}
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'articles' ? (
            <>
              {/* 日付フィルター */}
              <div className="mb-4">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    updateURL(e.target.value)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 選択済み記事数と全選択ボタン */}
              {articles.filter(a => a.processed && a.importance !== null).length > 0 && (
                <div className="mb-4 flex items-center justify-between bg-blue-50 rounded-lg p-3">
                  <div className="text-blue-800">
                    選択済み: {selectedArticles.size}件 / 分析済み: {articles.filter(a => a.processed && a.importance !== null).length}件
                  </div>
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    {selectedArticles.size === articles.filter(a => a.processed && a.importance !== null).length ? '全解除' : '全選択'}
                  </button>
                </div>
              )}

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
                    <div key={article.id} className={`rounded-lg shadow p-6 ${article.processed ? 'bg-white' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
                      <div className="flex items-start">
                        {/* チェックボックス */}
                        {article.processed && article.importance !== null && (
                          <input
                            type="checkbox"
                            checked={selectedArticles.has(article.id)}
                            onChange={() => handleArticleToggle(article.id)}
                            className="mt-1 mr-4 h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {article.title}
                          </h3>
                          <p className="text-gray-600 mb-3">{article.summary}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{article.source.name}</span>
                            <span>{formatDate(article.publishedAt)}</span>
                            {article.processed ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                処理済み
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">
                                未処理
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
                        <div className="ml-4 flex flex-col gap-2">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm text-center"
                          >
                            記事を読む
                          </a>
                          <button
                            onClick={() => handleAnalyzeSingle(article.id)}
                            disabled={analyzingArticles.has(article.id)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              analyzingArticles.has(article.id)
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : article.processed
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                            title={article.processed ? '再分析する' : 'この記事を分析する'}
                          >
                            {analyzingArticles.has(article.id) 
                              ? '分析中...' 
                              : article.processed 
                              ? '再分析' 
                              : '分析'}
                          </button>
                        </div>
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

export default function NewsPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen bg-gray-100"><Sidebar /><main className="flex-1 flex items-center justify-center"><div>読み込み中...</div></main></div>}>
      <NewsPageContent />
    </React.Suspense>
  )
}