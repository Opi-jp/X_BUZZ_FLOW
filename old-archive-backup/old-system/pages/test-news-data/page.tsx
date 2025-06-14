'use client'

import { useState, useEffect } from 'react'

interface NewsArticle {
  id: string
  title: string
  summary: string
  content: string
  url: string
  publishedAt: string
  category: string | null
  importance: number | null
  processed: boolean
  metadata: any
  source: {
    id: string
    name: string
    type: string
    category: string
  }
  analysis?: {
    id: string
    category: string
    summary: string
    japaneseSummary: string
    keyPoints: string[]
    impact: string
    analyzedBy: string
    createdAt: string
    updatedAt: string
  }
}

export default function TestNewsDataPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/news?limit=5&includeAnalysis=true')
      if (!response.ok) throw new Error('Failed to load articles')
      const data = await response.json()
      setArticles(data.articles || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ニュースデータ構造の調査</h1>
      
      {articles.map((article) => (
        <div key={article.id} className="mb-8 p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">{article.title}</h2>
          
          <div className="grid grid-cols-2 gap-6">
            {/* NewsArticle データ */}
            <div>
              <h3 className="font-semibold mb-2">NewsArticle テーブル</h3>
              <div className="space-y-2 text-sm">
                <div><strong>ID:</strong> {article.id}</div>
                <div><strong>URL:</strong> <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{article.url}</a></div>
                <div><strong>発行日:</strong> {new Date(article.publishedAt).toLocaleString('ja-JP')}</div>
                <div><strong>カテゴリ:</strong> {article.category || 'null'}</div>
                <div><strong>重要度:</strong> {article.importance ?? 'null'}</div>
                <div><strong>処理済み:</strong> {article.processed ? '✓' : '✗'}</div>
                <div><strong>ソース:</strong> {article.source.name} ({article.source.type})</div>
                <div><strong>要約:</strong> {article.summary}</div>
                {article.metadata && (
                  <div>
                    <strong>メタデータ:</strong>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(article.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* NewsAnalysis データ */}
            <div>
              <h3 className="font-semibold mb-2">NewsAnalysis テーブル</h3>
              {article.analysis ? (
                <div className="space-y-2 text-sm">
                  <div><strong>分析ID:</strong> {article.analysis.id}</div>
                  <div><strong>カテゴリ:</strong> {article.analysis.category}</div>
                  <div><strong>影響度:</strong> {article.analysis.impact}</div>
                  <div><strong>分析者:</strong> {article.analysis.analyzedBy}</div>
                  <div><strong>英語要約:</strong> {article.analysis.summary}</div>
                  <div><strong>日本語要約:</strong> {article.analysis.japaneseSummary}</div>
                  <div>
                    <strong>キーポイント:</strong>
                    <ul className="mt-1 list-disc list-inside">
                      {article.analysis.keyPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div><strong>作成日:</strong> {new Date(article.analysis.createdAt).toLocaleString('ja-JP')}</div>
                  <div><strong>更新日:</strong> {new Date(article.analysis.updatedAt).toLocaleString('ja-JP')}</div>
                </div>
              ) : (
                <div className="text-gray-500">未分析</div>
              )}
            </div>
          </div>

          {/* 生のJSONデータ表示 */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
              生のJSONデータを表示
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(article, null, 2)}
            </pre>
          </details>
        </div>
      ))}
    </div>
  )
}