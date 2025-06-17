'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ViralV2Page() {
  const router = useRouter()
  const [theme, setTheme] = useState('AIとビジネス')
  const [platform, setPlatform] = useState('Twitter')
  const [style, setStyle] = useState('洞察的')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)

  const createSession = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/viral/v2/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme,
          platform,
          style
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session')
      }

      setCurrentSession(data.session)
      setSessions([data.session, ...sessions])
      setCurrentStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const collectTopics = async () => {
    if (!currentSession) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/viral/v2/sessions/${currentSession.id}/collect-topics`, {
        method: 'POST'
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to collect topics')
      }

      setCurrentSession(data.session)
      setCurrentStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateConcepts = async () => {
    if (!currentSession) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/viral/v2/sessions/${currentSession.id}/generate-concepts`, {
        method: 'POST'
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate concepts')
      }

      setCurrentSession(data.session)
      setCurrentStep(4)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const goToCharacterGeneration = () => {
    router.push(`/viral/v2/test-character?sessionId=${currentSession.id}`)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">V2 バイラルコンテンツ生成システム</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：設定とプロセス */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: セッション作成 */}
          <div className={`bg-white p-6 rounded-lg shadow ${currentStep > 1 ? 'opacity-75' : ''}`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300'
              }`}>
                1
              </span>
              セッション作成
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テーマ
                </label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={currentStep > 1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    プラットフォーム
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    disabled={currentStep > 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="Twitter">Twitter</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Instagram">Instagram</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    スタイル
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    disabled={currentStep > 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="洞察的">洞察的</option>
                    <option value="教育的">教育的</option>
                    <option value="エンターテイメント">エンターテイメント</option>
                    <option value="個人的な話">個人的な話</option>
                  </select>
                </div>
              </div>
              
              <button
                onClick={createSession}
                disabled={loading || currentStep > 1}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading && currentStep === 1 ? '作成中...' : 'セッションを作成'}
              </button>
            </div>
          </div>

          {/* Step 2: トピック収集 */}
          <div className={`bg-white p-6 rounded-lg shadow ${
            currentStep < 2 ? 'opacity-50' : currentStep > 2 ? 'opacity-75' : ''
          }`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300'
              }`}>
                2
              </span>
              トピック収集（Perplexity）
            </h2>
            
            {currentStep >= 2 && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Perplexityで最新トレンドを収集し、バズる可能性の高い3つのトピックを特定します。
                </p>
                <button
                  onClick={collectTopics}
                  disabled={loading || currentStep !== 2}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading && currentStep === 2 ? '収集中...' : 'トピックを収集'}
                </button>
                
                {currentSession?.topics && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">収集されたトピック:</p>
                    {(currentSession.topics as any).parsed?.map((topic: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                        <span className={`inline-block w-6 h-6 rounded-full text-xs text-center leading-6 mr-2 ${
                          idx < 2 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {idx + 1}
                        </span>
                        {topic.TOPIC}
                        {idx < 2 && <span className="ml-2 text-xs text-green-600">✓ コンセプト生成対象</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 3: コンセプト生成 */}
          <div className={`bg-white p-6 rounded-lg shadow ${
            currentStep < 3 ? 'opacity-50' : currentStep > 3 ? 'opacity-75' : ''
          }`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300'
              }`}>
                3
              </span>
              コンセプト生成（GPT-4）
            </h2>
            
            {currentStep >= 3 && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  上位2つのトピックから各5つ、合計10個のコンセプトを生成します。
                </p>
                <button
                  onClick={generateConcepts}
                  disabled={loading || currentStep !== 3}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading && currentStep === 3 ? '生成中...' : 'コンセプトを生成'}
                </button>
                
                {currentSession?.concepts && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">
                      生成されたコンセプト: {(currentSession.concepts as any[]).length}個
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 4: キャラクター生成 */}
          <div className={`bg-white p-6 rounded-lg shadow ${
            currentStep < 4 ? 'opacity-50' : ''
          }`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                currentStep >= 4 ? 'bg-indigo-600 text-white' : 'bg-gray-300'
              }`}>
                4
              </span>
              キャラクターコンテンツ生成（Claude）
            </h2>
            
            {currentStep >= 4 && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  カーディ・ダーレなどのキャラクターで投稿文を生成します。
                </p>
                <button
                  onClick={goToCharacterGeneration}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  キャラクター生成画面へ
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* 右側：セッション情報 */}
        <div className="space-y-6">
          {currentSession && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">現在のセッション</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">ID:</dt>
                  <dd className="font-mono text-xs">{currentSession.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">テーマ:</dt>
                  <dd>{currentSession.theme}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">ステータス:</dt>
                  <dd className="capitalize">{currentSession.status}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">作成日時:</dt>
                  <dd>{new Date(currentSession.createdAt).toLocaleString('ja-JP')}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold mb-4">プロセスの特徴</h3>
            <ul className="space-y-2 text-sm text-blue-900">
              <li>• Perplexityで3つのトピックを収集</li>
              <li>• 上位2つのトピックを選択</li>
              <li>• 各トピックから5つのコンセプト生成</li>
              <li>• 合計10個のコンセプトを作成</li>
              <li>• カーディ・ダーレの視点で投稿文に変換</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}