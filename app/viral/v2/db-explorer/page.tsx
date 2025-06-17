'use client'

import { useState } from 'react'
import { DBClient } from '@/lib/db-client'

export default function DBExplorerPage() {
  const [query, setQuery] = useState(`{
  "table": "sessions",
  "where": {
    "topics": { "not": null }
  },
  "orderBy": { "createdAt": "desc" },
  "take": 5
}`)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const executeQuery = async () => {
    setLoading(true)
    setError('')
    try {
      const params = JSON.parse(query)
      const data = await DBClient.query(params)
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadExample = (example: string) => {
    const examples: Record<string, any> = {
      'latest-topics': {
        type: 'extract',
        params: {
          type: 'topics',
          extract: ['TOPIC', 'url', 'date', 'summary']
        }
      },
      'concepts-by-theme': {
        type: 'query',
        params: {
          table: 'sessions',
          where: { 
            theme: 'AIと働き方',
            concepts: { not: null }
          },
          select: {
            id: true,
            theme: true,
            concepts: true
          }
        }
      },
      'drafts-with-performance': {
        type: 'query',
        params: {
          table: 'drafts',
          include: {
            performance: true,
            session: {
              select: { theme: true }
            }
          },
          take: 10
        }
      }
    }
    
    if (examples[example]) {
      setQuery(JSON.stringify(examples[example].params, null, 2))
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">DBエクスプローラー</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {/* クエリエディタ */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">クエリ</h2>
            <div className="space-x-2 mb-2">
              <button
                onClick={() => loadExample('latest-topics')}
                className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                最新トピック
              </button>
              <button
                onClick={() => loadExample('concepts-by-theme')}
                className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                テーマ別コンセプト
              </button>
              <button
                onClick={() => loadExample('drafts-with-performance')}
                className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                下書き＋パフォーマンス
              </button>
            </div>
          </div>
          
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded"
            spellCheck={false}
          />
          
          <button
            onClick={executeQuery}
            disabled={loading}
            className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? '実行中...' : 'クエリ実行'}
          </button>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>
        
        {/* 結果表示 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">結果</h2>
          <div className="h-[500px] overflow-auto bg-gray-50 p-4 rounded">
            {result && (
              <pre className="text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
      
      {/* APIドキュメント */}
      <div className="mt-8 bg-gray-50 p-6 rounded">
        <h3 className="text-lg font-semibold mb-2">使い方</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>1. <code className="bg-gray-200 px-1">query</code> API: Prismaクエリと同じ構文でデータを取得</p>
          <p>2. <code className="bg-gray-200 px-1">extract</code> API: JSONフィールドから特定のデータを抽出</p>
          <p>3. where条件、select、include、orderBy、take、skipが使用可能</p>
        </div>
      </div>
    </div>
  )
}