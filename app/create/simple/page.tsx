'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Loader2, AlertCircle, ArrowRight, Check } from 'lucide-react'

interface StepData {
  theme: string
  platform: string
  style: string
  characterId: string
}

export default function SimpleCreatePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)
  
  const [data, setData] = useState<StepData>({
    theme: '',
    platform: 'Twitter',
    style: 'エンターテイメント',
    characterId: 'cardi-dare'
  })

  // 完全フローを実行
  const handleCreateFlow = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 新しい統合APIを使用
      const response = await fetch('/api/create/flow/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: data.theme,
          platform: data.platform,
          style: data.style,
          characterId: data.characterId,
          autoSelectConcepts: true
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'フロー実行に失敗しました')
      }
      
      setSessionId(result.data?.sessionId || result.sessionId)
      setResults(result.data || result)
      setCurrentStep(4) // 完了画面へ
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // ステップ1: テーマ入力
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-lg font-medium text-gray-900 mb-4">
          投稿テーマを入力してください
        </label>
        <input
          type="text"
          value={data.theme}
          onChange={(e) => setData({ ...data, theme: e.target.value })}
          placeholder="例: AIと働き方の未来"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-2 text-sm text-gray-600">
          AIが最新情報を収集し、バイラルコンテンツを生成します
        </p>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={() => setCurrentStep(2)}
          disabled={!data.theme}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          次へ
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  // ステップ2: スタイル選択
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-lg font-medium text-gray-900 mb-4">
          投稿スタイルを選択
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['エンターテイメント', '教育・解説', '感動・共感', 'ニュース・情報'].map((style) => (
            <label
              key={style}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                data.style === style
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="style"
                value={style}
                checked={data.style === style}
                onChange={(e) => setData({ ...data, style: e.target.value })}
                className="sr-only"
              />
              <span className="font-medium">{style}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          戻る
        </button>
        <button
          onClick={() => setCurrentStep(3)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          次へ
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  // ステップ3: 確認画面
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">生成内容の確認</h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-600">テーマ</dt>
            <dd className="mt-1 text-gray-900">{data.theme}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-600">プラットフォーム</dt>
            <dd className="mt-1 text-gray-900">Twitter / X</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-600">スタイル</dt>
            <dd className="mt-1 text-gray-900">{data.style}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-600">キャラクター</dt>
            <dd className="mt-1 text-gray-900">カーディ・ダーレ（53歳）</dd>
          </div>
        </dl>
      </div>
      
      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          これから以下の処理を実行します：
          <br />1. Perplexityで最新トピックを収集
          <br />2. GPTでバイラルコンセプトを生成
          <br />3. Claudeでキャラクター投稿を作成
          <br />4. 下書きとして保存
        </p>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          戻る
        </button>
        <button
          onClick={handleCreateFlow}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              生成を開始
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  )

  // ステップ4: 完了画面
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 rounded-lg p-6 text-center">
        <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-green-900 mb-2">
          生成が完了しました！
        </h3>
        <p className="text-green-700">
          {results?.stats?.draftsCreated || 0}個の投稿が作成されました
        </p>
      </div>
      
      {results?.drafts && results.drafts.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">生成された下書き:</h4>
          {results.drafts.map((draft: any) => (
            <div key={draft.id} className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium">{draft.title}</h5>
              <p className="text-sm text-gray-600 mt-1">{draft.preview}</p>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-center gap-4">
        <button
          onClick={() => router.push('/generation/post')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          投稿画面へ
        </button>
        <button
          onClick={() => {
            setCurrentStep(1)
            setData({ ...data, theme: '' })
            setResults(null)
            setSessionId(null)
          }}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          新規作成
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                シンプルコンテンツ生成
              </h1>
              <p className="text-gray-600">
                テーマを入力するだけで投稿を自動生成
              </p>
            </div>
          </div>
          
          {/* ステップインジケーター */}
          <div className="flex items-center justify-between mt-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 4 && (
                  <div className={`w-full h-1 ml-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* ステップコンテンツ */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      </div>
    </div>
  )
}