export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">BuzzFlow</h1>
        <p className="text-gray-600 mb-8">SNS投稿管理システム</p>
        <a
          href="/dashboard"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ダッシュボードへ
        </a>
      </div>
    </div>
  )
}