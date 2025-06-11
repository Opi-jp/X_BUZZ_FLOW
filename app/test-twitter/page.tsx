'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function TestTwitterPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testAuth = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/test-auth')
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const testTweet = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/test-tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'ツイート失敗')
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const testDirectTweet = async () => {
    setLoading(true)
    setError(null)
    try {
      // 直接ユーザーIDを指定してツイート
      const res = await fetch('/api/twitter/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '1b75ab50-342d-44c2-a0d7-3dc4a8ec01df', // DBから取得したユーザーID
          content: 'BuzzFlowからの直接テスト投稿 ' + new Date().toLocaleString('ja-JP')
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'ツイート失敗')
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Twitter認証テスト</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">現在のセッション状態</h2>
        <p>ステータス: <span className="font-mono">{status}</span></p>
        {session && (
          <div className="mt-2">
            <p>ユーザー名: {session.user?.name}</p>
            <p>ID: {(session.user as any)?.id}</p>
          </div>
        )}
      </div>

      <div className="space-x-4 mb-6">
        <button
          onClick={testAuth}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          認証状態を確認
        </button>
        
        <button
          onClick={testTweet}
          disabled={loading || status !== 'authenticated'}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          テストツイート投稿
        </button>
        
        <button
          onClick={testDirectTweet}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          直接ツイート投稿（ID指定）
        </button>
      </div>

      {loading && <p className="text-gray-600">処理中...</p>}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          エラー: {error}
        </div>
      )}
      
      {result && (
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">結果:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}