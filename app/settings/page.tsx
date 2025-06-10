'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/layout/Sidebar'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const importTweets = async () => {
    if (!session) {
      alert('ログインが必要です')
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const res = await fetch('/api/import-tweets', {
        method: 'POST',
      })

      const data = await res.json()
      
      if (res.ok) {
        setImportResult(data.message)
      } else {
        setImportResult(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('Error importing tweets:', error)
      setImportResult('インポート中にエラーが発生しました')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">設定</h1>
            <p className="mt-1 text-sm text-gray-600">
              アカウント設定とデータ管理
            </p>
          </div>

          {/* アカウント情報 */}
          {session?.user && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                アカウント情報
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  ユーザー名: <span className="font-medium text-gray-900">@{session.user.name}</span>
                </p>
                {session.user.email && (
                  <p className="text-sm text-gray-600">
                    メールアドレス: <span className="font-medium text-gray-900">{session.user.email}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ツイートインポート */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              過去のツイートをインポート
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              あなたの過去のツイート（最新100件）を分析データとしてインポートします。
            </p>
            
            <button
              onClick={importTweets}
              disabled={importing || !session}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {importing ? 'インポート中...' : 'ツイートをインポート'}
            </button>

            {importResult && (
              <div className={`mt-4 p-3 rounded-md ${
                importResult.includes('エラー') 
                  ? 'bg-red-50 text-red-800' 
                  : 'bg-green-50 text-green-800'
              }`}>
                {importResult}
              </div>
            )}

            <div className="mt-4 p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>注意:</strong> Twitter APIの制限により、インプレッション数は取得できない場合があります。
                また、プロモーションツイートや返信は除外されます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}