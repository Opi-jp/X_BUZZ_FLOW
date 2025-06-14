'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { Sparkles, Loader2, CheckCircle, Clock, AlertCircle, ChevronRight, Eye } from 'lucide-react'

interface PhaseResult {
  phase: string
  result: any
  timestamp: string
}

export default function CotStepByStepPage() {
  const router = useRouter()
  const [config, setConfig] = useState({
    expertise: '',
    platform: 'Twitter',
    style: '教育的'
  })
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [phaseResults, setPhaseResults] = useState<PhaseResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const phases = [
    { id: 'setup', name: '設定', description: 'コンテンツ生成の設定を行います' },
    { id: 'think', name: 'Phase 1: 情報収集', description: 'トレンドと関連情報を収集します' },
    { id: 'execute', name: 'Phase 2: 分析', description: '収集した情報を詳細に分析します' },
    { id: 'integrate', name: 'Phase 3: コンセプト生成', description: 'バイラルコンセプトを生成します' },
    { id: 'content', name: 'Phase 4: コンテンツ作成', description: '実際の投稿コンテンツを作成します' },
    { id: 'strategy', name: 'Phase 5: 戦略策定', description: '投稿戦略を策定します' },
    { id: 'complete', name: '完了', description: '生成が完了しました' }
  ]

  const handleStartGeneration = async () => {
    if (!config.expertise) {
      alert('発信したい分野を入力してください')
      return
    }

    setIsProcessing(true)
    setError(null)
    
    try {
      // セッション作成
      const createResponse = await fetch('/api/viral/cot-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (!createResponse.ok) {
        throw new Error('セッション作成に失敗しました')
      }

      const { sessionId: newSessionId } = await createResponse.json()
      setSessionId(newSessionId)
      setCurrentPhase(1)
      
      // 最初のフェーズ（Think）を自動的に開始
      await processPhase(newSessionId, 1)
    } catch (error) {
      console.error('Generation failed:', error)
      setError(error instanceof Error ? error.message : '予期しないエラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const processPhase = async (sessionId: string, phaseIndex: number) => {
    setIsProcessing(true)
    setError(null)

    try {
      // 該当フェーズの処理を実行
      const phaseMap: { [key: number]: string } = {
        1: 'think',
        2: 'execute', 
        3: 'integrate',
        4: 'content',
        5: 'strategy'
      }

      const phaseEndpoint = phaseMap[phaseIndex]
      if (!phaseEndpoint) return

      // Process APIを呼び出し
      const response = await fetch(`/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: phaseEndpoint })
      })

      if (!response.ok) {
        throw new Error(`Phase ${phaseIndex} の処理に失敗しました`)
      }

      // 処理完了を待機（ポーリング）
      let completed = false
      let retryCount = 0
      const maxRetries = 60 // 最大2分間

      while (!completed && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const statusResponse = await fetch(`/api/viral/cot-session/${sessionId}`)
        const session = await statusResponse.json()

        if (session.phaseProgress >= phaseIndex) {
          completed = true
          
          // 結果を保存
          const phaseResult: PhaseResult = {
            phase: phases[phaseIndex].name,
            result: session[`phase${phaseIndex}Result`] || session.stepResults?.[phaseIndex - 1],
            timestamp: new Date().toISOString()
          }
          setPhaseResults(prev => [...prev, phaseResult])
        }

        retryCount++
      }

      if (!completed) {
        throw new Error('処理がタイムアウトしました')
      }
    } catch (error) {
      console.error(`Phase ${phaseIndex} failed:`, error)
      setError(error instanceof Error ? error.message : '予期しないエラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNextPhase = async () => {
    if (!sessionId) return

    const nextPhase = currentPhase + 1
    setCurrentPhase(nextPhase)

    if (nextPhase <= 5) {
      await processPhase(sessionId, nextPhase)
    } else if (nextPhase === 6) {
      // 完了画面
      setCurrentPhase(6)
    }
  }

  const handleViewResult = (index: number) => {
    console.log('View result for phase:', index, phaseResults[index])
    // TODO: 結果詳細表示のモーダルまたは別ページへの遷移
  }

  const handleGoToResults = () => {
    if (sessionId) {
      router.push(`/viral/cot/result/${sessionId}`)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-blue-500" />
            AIバイラルコンテンツ生成（ステップバイステップ）
          </h1>
          <p className="mt-2 text-gray-600">
            各フェーズの結果を確認しながら、段階的にコンテンツを生成します
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
                  ${index < currentPhase ? 'bg-green-500' : 
                    index === currentPhase ? 'bg-blue-500' : 'bg-gray-300'}
                `}>
                  {index < currentPhase ? <CheckCircle className="w-6 h-6" /> : index + 1}
                </div>
                {index < phases.length - 1 && (
                  <div className={`w-full h-1 mx-2 ${index < currentPhase ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {phases.map((phase, index) => (
              <div key={phase.id} className="text-xs text-gray-600 text-center">
                {phase.name.split(':')[0]}
              </div>
            ))}
          </div>
        </div>

        {/* Current phase content */}
        <div className="bg-white rounded-lg shadow p-6">
          {currentPhase === 0 ? (
            // 設定画面
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">生成設定</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    発信したい分野 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.expertise}
                    onChange={(e) => setConfig({ ...config, expertise: e.target.value })}
                    placeholder="例: AI × 働き方、Web3 × 教育、健康 × テクノロジー"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プラットフォーム
                  </label>
                  <select
                    value={config.platform}
                    onChange={(e) => setConfig({ ...config, platform: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Twitter">Twitter</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    コンテンツスタイル
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['教育的', 'エンターテイメント', '解説', '個人的な話'].map((style) => (
                      <button
                        key={style}
                        onClick={() => setConfig({ ...config, style })}
                        className={`
                          px-4 py-2 rounded-lg border transition-colors
                          ${config.style === style 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-300 hover:border-gray-400'
                          }
                        `}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartGeneration}
                  disabled={!config.expertise || isProcessing}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? '処理中...' : '生成を開始'}
                </button>
              </div>
            </>
          ) : currentPhase <= 5 ? (
            // 各フェーズの処理画面
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {phases[currentPhase].name}
              </h2>
              <p className="text-gray-600 mb-6">{phases[currentPhase].description}</p>

              {isProcessing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-600">処理中です...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <p className="text-red-800">{error}</p>
                  </div>
                </div>
              ) : (
                <>
                  {phaseResults[currentPhase - 1] && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900">処理結果</h3>
                        <button
                          onClick={() => handleViewResult(currentPhase - 1)}
                          className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          詳細を見る
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {phases[currentPhase].name}の処理が完了しました
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentPhase(currentPhase - 1)}
                      disabled={currentPhase === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      前のステップへ
                    </button>
                    <button
                      onClick={handleNextPhase}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                    >
                      次のステップへ
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            // 完了画面
            <>
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">生成完了！</h2>
                <p className="text-gray-600 mb-8">
                  すべてのフェーズが完了しました。結果を確認してください。
                </p>

                <div className="space-y-4 mb-8">
                  {phaseResults.map((result, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                      <div className="text-left">
                        <h3 className="font-semibold">{result.phase}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(result.timestamp).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewResult(index)}
                        className="text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <Eye className="w-5 h-5 mr-1" />
                        結果を見る
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGoToResults}
                  className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
                >
                  結果ページへ
                </button>
              </div>
            </>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}