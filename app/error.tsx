'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            エラーが発生しました
          </h2>
          <p className="text-gray-600 mb-4">
            申し訳ございません。予期しないエラーが発生しました。
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 mb-4">
              エラーID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            もう一度試す
          </button>
        </div>
      </div>
    </div>
  )
}