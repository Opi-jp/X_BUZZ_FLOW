export default function TestUIPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">UIテストページ</h1>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
        <h2 className="text-2xl font-semibold mb-2">Tailwind CSSテスト</h2>
        <p className="text-gray-600 mb-4">このカードが正しくスタイリングされていればTailwindは動作しています。</p>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          テストボタン
        </button>
      </div>
    </div>
  )
}