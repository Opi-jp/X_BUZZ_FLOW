import Link from 'next/link'

export default function PublicTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">パブリックテストページ</h1>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
        <h2 className="text-2xl font-semibold mb-2">認証不要ページ</h2>
        <p className="text-gray-600 mb-4">このページは認証なしでアクセスできます。</p>
        <div className="space-y-2">
          <Link href="/auth/signin" className="block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-center">
            ログインページへ
          </Link>
          <Link href="/test-ui" className="block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-center">
            UIテストページへ
          </Link>
        </div>
      </div>
    </div>
  )
}