'use client'

import { useState, useEffect } from 'react'

export default function DataStatusPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDataStatus()
  }, [])

  const fetchDataStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/data-status')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching data status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">データ状況を確認中...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">データの取得に失敗しました</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">📊 データ統合状況</h1>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">🔥 バズツイート</h2>
          <div className="text-3xl font-bold text-blue-600">{data.summary.buzzPosts.total}</div>
          <div className="text-sm text-gray-600 mt-2">
            最終収集: {data.summary.buzzPosts.latest ? new Date(data.summary.buzzPosts.latest).toLocaleString('ja-JP') : 'なし'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">📰 ニュース記事</h2>
          <div className="text-3xl font-bold text-green-600">{data.summary.newsArticles.total}</div>
          <div className="text-sm text-gray-600 mt-2">
            最新記事: {data.summary.newsArticles.latest ? new Date(data.summary.newsArticles.latest).toLocaleString('ja-JP') : 'なし'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">📅 予定投稿</h2>
          <div className="text-3xl font-bold text-purple-600">{data.summary.scheduledPosts.total}</div>
          <div className="text-sm text-gray-600 mt-2">
            下書き: {data.summary.scheduledPosts.pending}件
          </div>
        </div>
      </div>

      {/* 収集設定 */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">⚙️ 収集設定</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium">コレクションプリセット</h3>
            <p className="text-2xl font-bold">{data.summary.collectionPresets.active}/{data.summary.collectionPresets.total}</p>
            <p className="text-sm text-gray-600">アクティブ/総数</p>
          </div>
          <div>
            <h3 className="font-medium">ニュースソース</h3>
            <p className="text-2xl font-bold">{data.summary.newsSources.active}/{data.summary.newsSources.total}</p>
            <p className="text-sm text-gray-600">アクティブ/総数</p>
          </div>
        </div>
      </div>

      {/* 最新データ */}
      <div className="space-y-6">
        {/* 最新バズツイート */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🔥 最新のバズツイート</h2>
          {data.data.latestBuzzPosts.length === 0 ? (
            <p className="text-gray-500">データがありません</p>
          ) : (
            <div className="space-y-3">
              {data.data.latestBuzzPosts.map((post: any) => (
                <div key={post.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="text-sm">{post.content.substring(0, 100)}...</p>
                  <p className="text-xs text-gray-600 mt-1">
                    @{post.authorUsername} | {post.likesCount.toLocaleString()}いいね | {post.theme}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 最新ニュース */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📰 最新のニュース記事</h2>
          {data.data.latestNewsArticles.length === 0 ? (
            <p className="text-gray-500">データがありません</p>
          ) : (
            <div className="space-y-3">
              {data.data.latestNewsArticles.map((article: any) => (
                <div key={article.id} className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-medium text-sm">{article.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ソースID: {article.sourceId} | 重要度: {((article.importance || 0) * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* アクティブプリセット */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🎯 アクティブな収集プリセット</h2>
          {data.data.activePresets.length === 0 ? (
            <p className="text-gray-500">アクティブなプリセットがありません</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {data.data.activePresets.map((preset: any, i: number) => (
                <div key={i} className="border rounded p-3">
                  <p className="font-medium text-sm">{preset.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    クエリ: {preset.query} | カテゴリ: {preset.category}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => window.location.href = '/collect'}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          バズツイート収集
        </button>
        <button
          onClick={() => window.location.href = '/news'}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          ニュース管理
        </button>
        <button
          onClick={fetchDataStatus}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          更新
        </button>
      </div>
    </div>
  )
}