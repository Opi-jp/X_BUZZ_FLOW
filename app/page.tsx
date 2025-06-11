import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">BuzzFlow</h1>
        <p className="text-xl text-gray-600 mb-8">
          AIを活用したSNS発信の効率化システム
        </p>
        <div className="space-x-4">
          <Link 
            href="/auth/signin"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            ログイン
          </Link>
          <Link 
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ダッシュボードへ
          </Link>
        </div>
      </div>
    </div>
  )
}