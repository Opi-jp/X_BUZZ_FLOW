'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: '設定エラー: Twitter APIの設定を確認してください',
    AccessDenied: 'アクセスが拒否されました',
    Verification: '認証エラー: もう一度お試しください',
    Default: '予期しないエラーが発生しました',
  }

  const message = errorMessages[error || 'Default'] || errorMessages.Default

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              認証エラー
            </h1>
            <p className="text-red-600">
              {message}
            </p>
            {error && (
              <p className="text-sm text-gray-500 mt-2">
                エラーコード: {error}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              もう一度ログイン
            </Link>
            <Link
              href="/dashboard"
              className="block w-full text-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ダッシュボードに戻る
            </Link>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            <p className="font-semibold mb-2">考えられる原因:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Twitter APIのClient ID/Secretが正しくない</li>
              <li>Callback URLが一致していない</li>
              <li>必要なスコープが許可されていない</li>
              <li>Twitter Developerアプリの設定が不完全</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}