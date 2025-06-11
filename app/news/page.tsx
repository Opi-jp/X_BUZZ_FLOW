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
  dateCount?: number // 日付別の記事数
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
  analysis?: {
    id: string
    category: string
    summary: string
    japaneseSummary: string
    keyPoints: string[]
    impact: string
    analyzedBy: string
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
  // 初期日付を本日に設定（URLパラメータがない場合）
  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }
  
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || getTodayDate())
  const [activeTab, setActiveTab] = useState<'sources' | 'articles'>(
    (searchParams.get('tab') as 'sources' | 'articles') || 'articles'
  )
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [collectTargetDate, setCollectTargetDate] = useState('')
  const [analyzingArticles, setAnalyzingArticles] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'publishedAt' | 'importance'>('publishedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 初回表示時にURLに日付を設定
  useEffect(() => {
    if (!searchParams.get('date')) {
      updateURL(selectedDate)
    }
  }, [])

  useEffect(() => {
    fetchSources()
    fetchArticles()
  }, [selectedDate, sortBy, sortOrder])

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
      const params = new URLSearchParams()
      if (selectedDate) params.append('date', selectedDate)
      
      const res = await fetch(`/api/news/sources?${params}`)
      const data = await res.json()
      // データが配列であることを確認
      setSources(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching sources:', error)
      setSources([])
    }
  }

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDate) params.append('date', selectedDate)
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)
      params.append('limit', '100') // 最大100件に制限
      
      const res = await fetch(`/api/news/articles?${params}`)
      const data = await res.json()
      // データが正しい形式であることを確認
      setArticles(Array.isArray(data.articles) ? data.articles : [])
    } catch (error) {
      console.error('Error fetching articles:', error)
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  const handleCollect = async (type: string) => {
    
    setCollectingType(type)
    try {
      // RSS収集のみをサポート
      if (type !== 'rss') {
        alert('RSS収集のみ利用可能です')
        return
      }
      
      const endpoint = '/api/news/collect-rss-v2'
      
      console.log(`収集タイプ: ${type}, エンドポイント: ${endpoint}`)
      
      // 日付フィルターを設定
      let sinceDate = null
      if (collectTargetDate) {
        // 指定日の00:00:00から収集
        sinceDate = new Date(collectTargetDate + 'T00:00:00')
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sinceDate: sinceDate?.toISOString() 
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        let message = data.message || `${data.saved || 0}件保存しました`
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

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('この記事を削除しますか？')) {
      return
    }

    try {
      const res = await fetch(`/api/news/articles/${articleId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      
      if (res.ok) {
        alert('記事を削除しました')
        // 記事一覧を再取得
        fetchArticles()
      } else {
        alert(data.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting article:', error)
      alert('削除中にエラーが発生しました')
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

            <div className="flex gap-2 flex-wrap items-center">
              {/* 収集日付フィルター */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md">
                <label className="text-sm text-gray-600">収集対象日:</label>
                <input
                  type="date"
                  value={collectTargetDate}
                  onChange={(e) => setCollectTargetDate(e.target.value)}
                  className="text-sm border-0 bg-transparent focus:ring-0"
                  title="指定日以降の記事を収集"
                />
                {collectTargetDate && (
                  <button
                    onClick={() => setCollectTargetDate('')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    title="日付フィルターをクリア"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* RSS収集 */}
              <button
                onClick={() => handleCollect('rss')}
                disabled={collectingType !== null}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 font-medium shadow-sm"
                title="RSSフィードから記事を収集"
              >
                {collectingType === 'rss' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    開始中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    RSS収集
                  </span>
                )}
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
              <button
                onClick={handleGenerateThread}
                disabled={generating || selectedArticles.size === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                title={selectedArticles.size === 0 ? '記事を選択してください' : `選択した${selectedArticles.size}件からスレッドを生成`}
              >
                {generating ? '生成中...' : `スレッド生成 (${selectedArticles.size}件)`}
              </button>
            </div>
          </div>

          {activeTab === 'articles' ? (
            <>
              {/* 日付フィルター */}
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    updateURL(e.target.value)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const today = getTodayDate()
                      setSelectedDate(today)
                      updateURL(today)
                    }}
                    className={`px-3 py-2 text-sm rounded-md ${
                      selectedDate === getTodayDate() 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    今日
                  </button>
                  <button
                    onClick={() => {
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)
                      const yesterdayStr = yesterday.toISOString().split('T')[0]
                      setSelectedDate(yesterdayStr)
                      updateURL(yesterdayStr)
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm rounded-md"
                  >
                    昨日
                  </button>
                  <button
                    onClick={() => {
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      const weekAgoStr = weekAgo.toISOString().split('T')[0]
                      setSelectedDate(weekAgoStr)
                      updateURL(weekAgoStr)
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm rounded-md"
                  >
                    1週間前
                  </button>
                </div>
              </div>

              {/* 記事統計と選択ボタン */}
              <div className="mb-4 bg-blue-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-blue-800 space-x-4">
                    <span>取得済み: {articles.length}件</span>
                    {articles.filter(a => !a.processed).length > 0 && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                        未処理: {articles.filter(a => !a.processed).length}件
                      </span>
                    )}
                    <span className="text-blue-600">選択済み: {selectedArticles.size}件</span>
                    <span className="font-semibold">分析済み: {articles.filter(a => a.processed && a.importance !== null).length}件</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* ソートボタン */}
                    <div className="flex items-center gap-1 bg-white rounded-md px-2 py-1">
                      <label className="text-xs text-gray-600">並び順:</label>
                      <button
                        onClick={() => {
                          setSortBy('publishedAt')
                          setSortOrder('desc')
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          sortBy === 'publishedAt' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        日付順
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('importance')
                          setSortOrder('desc')
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          sortBy === 'importance' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        重要度順
                      </button>
                    </div>
                    {articles.filter(a => a.processed && a.importance !== null).length > 0 && (
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        {selectedArticles.size === articles.filter(a => a.processed && a.importance !== null).length ? '全解除' : '全選択'}
                      </button>
                    )}
                  </div>
                </div>
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
                          {/* 新しい分析テーブルからデータを表示 */}
                          {article.analysis && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                              <p className="text-gray-700">
                                {article.analysis.japaneseSummary || article.analysis.summary}
                              </p>
                              {article.analysis.keyPoints && article.analysis.keyPoints.length > 0 && (
                                <ul className="mt-2 list-disc list-inside text-gray-600">
                                  {article.analysis.keyPoints.map((point: string, index: number) => (
                                    <li key={index}>{point}</li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-2 text-xs text-gray-500">
                                分析方法: {article.analysis.analyzedBy === 'claude' ? 'Claude AI' : article.analysis.analyzedBy}
                              </div>
                            </div>
                          )}
                          {/* 古いmetadata.analysisからもデータを表示（移行期間中） */}
                          {!article.analysis && article.metadata?.analysis && (
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
                            onClick={() => handleDeleteArticle(article.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            title="記事を削除"
                          >
                            削除
                          </button>
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
              {!sources || sources.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-500">ソースがありません</p>
                </div>
              ) : (
                (Array.isArray(sources) ? sources : []).filter(source => source && source.type !== 'TWITTER').map((source) => (
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
                            総記事数: {source._count.articles}
                            {source.dateCount !== undefined && selectedDate && (
                              <span className="ml-2 text-blue-600 font-medium">
                                ({selectedDate}: {source.dateCount}件)
                              </span>
                            )}
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