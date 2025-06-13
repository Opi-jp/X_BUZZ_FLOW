'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { Sparkles, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface CotPhase {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: any
}

export default function CotGeneratePage() {
  const router = useRouter()
  const [config, setConfig] = useState({
    expertise: '',
    platform: 'Twitter',
    style: '教育的'
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [phases, setPhases] = useState<CotPhase[]>([
    { id: 'think', name: 'Phase 1: 情報収集', description: 'トレンドと関連情報を収集中...', status: 'pending' },
    { id: 'execute', name: 'Phase 2: 分析', description: '収集した情報を分析中...', status: 'pending' },
    { id: 'integrate', name: 'Phase 3: コンセプト生成', description: 'バイラルコンセプトを生成中...', status: 'pending' },
    { id: 'content', name: 'Phase 4: コンテンツ作成', description: '実際の投稿を作成中...', status: 'pending' },
    { id: 'strategy', name: 'Phase 5: 戦略策定', description: '投稿戦略を策定中...', status: 'pending' }
  ])
  const [sessionId, setSessionId] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!config.expertise) {
      alert('発信したい分野を入力してください')
      return
    }

    setIsGenerating(true)
    
    try {
      // セッション作成
      const createResponse = await fetch('/api/viral/cot-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      const { sessionId: newSessionId } = await createResponse.json()
      setSessionId(newSessionId)

      // フェーズを順次実行
      for (let i = 0; i < phases.length; i++) {
        setPhases(prev => prev.map((p, idx) => ({
          ...p,
          status: idx === i ? 'running' : idx < i ? 'completed' : 'pending'
        })))

        // 各フェーズの実行をシミュレート（実際はAPIを呼ぶ）
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        setPhases(prev => prev.map((p, idx) => ({
          ...p,
          status: idx <= i ? 'completed' : 'pending'
        })))
      }

      // 完了後、結果ページへ遷移
      router.push(`/viral/cot/result/${newSessionId}`)
      
    } catch (error) {
      console.error('Generation failed:', error)
      setPhases(prev => prev.map(p => ({
        ...p,
        status: p.status === 'running' ? 'error' : p.status
      })))
    } finally {
      setIsGenerating(false)
    }
  }

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-blue-500" />
            AIバイラルコンテンツ生成
          </h1>
          <p className="mt-2 text-gray-600">
            Chain of Thoughtで、あなたの分野に最適化されたバイラルコンテンツを生成します
          </p>
        </div>

        {!isGenerating ? (
          <div className="bg-white rounded-lg shadow p-6">
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
                <p className="mt-1 text-sm text-gray-500">
                  あなたが発信したい分野やテーマを自由に入力してください
                </p>
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

              <div className="pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={!config.expertise}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  生成を開始
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">生成プロセス</h2>
            
            <div className="space-y-4">
              {phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${phase.status === 'running' ? 'border-blue-500 bg-blue-50' : 
                      phase.status === 'completed' ? 'border-green-500 bg-green-50' :
                      phase.status === 'error' ? 'border-red-500 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getPhaseIcon(phase.status)}
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{phase.name}</p>
                        <p className="text-sm text-gray-600">{phase.description}</p>
                      </div>
                    </div>
                    {phase.status === 'running' && (
                      <div className="text-sm text-blue-600 font-medium">
                        処理中...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 ヒント: 生成には2〜3分かかります。完了後、自動的に結果ページに移動します。
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}