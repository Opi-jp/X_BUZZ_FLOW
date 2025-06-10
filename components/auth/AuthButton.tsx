'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="text-gray-400">Loading...</div>
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <p className="text-gray-700">@{session.user.username}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ログアウト
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('twitter')}
      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 text-sm"
    >
      ログイン
    </button>
  )
}