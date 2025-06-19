'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Twitter, CheckCircle, AlertCircle, Loader2, LogOut } from 'lucide-react'

export default function TwitterAuthPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const handleSignIn = async () => {
    setConnecting(true)
    setError(null)
    
    try {
      const result = await signIn('twitter', {
        redirect: false,
        callbackUrl: '/auth/twitter/callback'
      })
      
      if (result?.error) {
        setError('認証に失敗しました。もう一度お試しください。')
      }
    } catch (error) {
      setError('エラーが発生しました。')
    } finally {
      setConnecting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    setError(null)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-400 to-blue-600 p-6">
            <div className="flex items-center justify-center">
              <Twitter className="w-12 h-12 text-white" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-center text-white">
              Twitter連携
            </h1>
            <p className="mt-2 text-center text-blue-100">
              X_BUZZ_FLOWからツイートを投稿するために
            </p>
          </div>

          <div className="p-6">
            {session ? (
              /* 認証済み */
              <div className="space-y-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-green-800">
                        連携済み
                      </h3>
                      <div className="mt-1 text-sm text-green-700">
                        <p>@{session.user?.name || 'Unknown'}</p>
                        <p className="text-xs mt-1">
                          {session.user?.email || 'アカウント情報なし'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    権限
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      ツイートの投稿
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      プロフィール情報の取得
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      フォロワー情報の取得
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/generation/content')}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    コンテンツ生成へ
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    連携解除
                  </button>
                </div>
              </div>
            ) : (
              /* 未認証 */
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Twitter連携でできること
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• AIが生成したコンテンツを自動投稿</li>
                      <li>• 投稿のスケジュール設定</li>
                      <li>• エンゲージメント分析</li>
                      <li>• フォロワーのトレンド分析</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      <strong>注意:</strong> Twitter連携により、あなたのアカウントで
                      ツイートを投稿する権限を付与します。いつでも連携を解除できます。
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={connecting}
                  className="w-full px-4 py-3 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      接続中...
                    </>
                  ) : (
                    <>
                      <Twitter className="w-5 h-5" />
                      Twitterでサインイン
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4">
            <p className="text-xs text-center text-gray-500">
              X_BUZZ_FLOWは、Twitter APIを使用して
              安全にあなたのアカウントと連携します
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}