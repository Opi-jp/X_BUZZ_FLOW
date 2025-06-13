'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function SignInPage() {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('twitter', { callbackUrl: '/viral/gpt' })
    } catch (error) {
      console.error('Sign in error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">BuzzFlow</h1>
            <p className="mt-2 text-gray-600">
              X（Twitter）アカウントでログインしてください
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {loading ? 'ログイン中...' : 'X（Twitter）でログイン'}
          </button>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>ログインすることで、以下の権限を許可します：</p>
            <ul className="mt-2 space-y-1">
              <li>• プロフィール情報の読み取り</li>
              <li>• ツイートの読み取り</li>
              <li>• ツイートの投稿</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}