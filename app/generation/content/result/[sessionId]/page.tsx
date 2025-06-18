'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/app/components/layout/AppLayout'
import { 
  Sparkles, 
  RefreshCw, 
  Send, 
  Calendar,
  Copy,
  Edit3,
  ChevronDown,
  Check,
  Loader2
} from 'lucide-react'

interface CotResult {
  sessionId: string
  status: string
  config: {
    expertise: string
    platform: string
    style: string
  }
  results: {
    phase1?: any
    phase2?: any
    phase3?: any
    phase4?: {
      mainPost: string
      threadPosts?: string[]
      hashtags: string[]
      mediaRecommendations?: string[]
    }
    phase5?: {
      bestTimeToPost: string[]
      expectedEngagement: string
      followUpStrategy: string
    }
  }
}

interface ToneOption {
  id: string
  name: string
  description: string
}

const toneOptions: ToneOption[] = [
  { id: 'default', name: 'オリジナル', description: 'GPTが生成したままの文体' },
  { id: 'casual', name: 'カジュアル', description: 'フレンドリーで親しみやすい' },
  { id: 'professional', name: 'プロフェッショナル', description: 'ビジネスライクで信頼感のある' },
  { id: 'emotional', name: 'エモーショナル', description: '感情豊かで共感を呼ぶ' },
  { id: 'humorous', name: 'ユーモラス', description: '軽快で楽しい雰囲気' },
  { id: 'custom', name: 'カスタム', description: '自分で文体を定義' }
]

export default function CotResultPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [result, setResult] = useState<CotResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTone, setSelectedTone] = useState('default')
  const [rewrittenContent, setRewrittenContent] = useState('')
  const [isRewriting, setIsRewriting] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')

  useEffect(() => {
    fetchResult()
  }, [sessionId])

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/viral/cot-session/${sessionId}`)
      const data = await response.json()
      setResult(data)
      setEditedContent(data.results.phase4?.mainPost || '')
    } catch (error) {
      console.error('Failed to fetch result:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRewrite = async () => {
    if (selectedTone === 'default' || !result?.results.phase4?.mainPost) return
    
    setIsRewriting(true)
    try {
      const response = await fetch('/api/viral/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: result.results.phase4.mainPost,
          tone: selectedTone,
          platform: result.config.platform
        })
      })
      
      const data = await response.json()
      setRewrittenContent(data.rewritten)
      setEditedContent(data.rewritten)
    } catch (error) {
      console.error('Rewrite failed:', error)
    } finally {
      setIsRewriting(false)
    }
  }

  const handlePost = async (schedule = false) => {
    const contentToPost = editMode ? editedContent : 
                         selectedTone !== 'default' ? rewrittenContent : 
                         result?.results.phase4?.mainPost || ''
    
    if (!contentToPost) return

    try {
      if (schedule) {
        setShowScheduler(true)
      } else {
        const response = await fetch('/api/viral/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: contentToPost,
            sessionId: sessionId
          })
        })
        
        if (response.ok) {
          alert('投稿しました！')
          router.push('/viral/drafts')
        }
      }
    } catch (error) {
      console.error('Post failed:', error)
      alert('投稿に失敗しました')
    }
  }

  const copyToClipboard = () => {
    const content = editMode ? editedContent : 
                   selectedTone !== 'default' ? rewrittenContent : 
                   result?.results.phase4?.mainPost || ''
    navigator.clipboard.writeText(content)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AppLayout>
    )
  }

  if (!result || result.status !== 'COMPLETED') {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">コンテンツの生成中です...</p>
          <button
            onClick={() => router.push('/viral/cot')}
            className="mt-4 text-blue-500 hover:text-blue-700"
          >
            生成画面に戻る
          </button>
        </div>
      </AppLayout>
    )
  }

  const currentContent = editMode ? editedContent : 
                        selectedTone !== 'default' ? rewrittenContent : 
                        result.results.phase4?.mainPost || ''

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-blue-500" />
            生成完了
          </h1>
          <p className="mt-2 text-gray-600">
            {result.config.expertise} のバイラルコンテンツが生成されました
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">生成されたコンテンツ</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  editMode 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {editMode ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="whitespace-pre-wrap">{currentContent}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div>文字数: {currentContent.length}</div>
            {result.results.phase4?.hashtags && (
              <div className="flex items-center gap-2">
                {result.results.phase4.hashtags.map((tag, idx) => (
                  <span key={idx} className="text-blue-500">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tone Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">文体を変更</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {toneOptions.map((tone) => (
              <button
                key={tone.id}
                onClick={() => setSelectedTone(tone.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedTone === tone.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{tone.name}</div>
                <div className="text-sm text-gray-600">{tone.description}</div>
              </button>
            ))}
          </div>

          {selectedTone !== 'default' && (
            <button
              onClick={handleRewrite}
              disabled={isRewriting}
              className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  リライト中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  この文体でリライト
                </>
              )}
            </button>
          )}
        </div>

        {/* Strategy Insights */}
        {result.results.phase5 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">投稿戦略</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">おすすめ投稿時間</p>
                <p className="text-gray-900">{result.results.phase5.bestTimeToPost.join(', ')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">予想エンゲージメント</p>
                <p className="text-gray-900">{result.results.phase5.expectedEngagement}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">フォローアップ戦略</p>
                <p className="text-gray-900">{result.results.phase5.followUpStrategy}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handlePost(false)}
            className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center"
          >
            <Send className="w-5 h-5 mr-2" />
            今すぐ投稿
          </button>
          <button
            onClick={() => handlePost(true)}
            className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 flex items-center justify-center"
          >
            <Calendar className="w-5 h-5 mr-2" />
            スケジュール投稿
          </button>
        </div>

        {/* Schedule Modal */}
        {showScheduler && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">投稿をスケジュール</h3>
              <p className="text-gray-600 mb-4">
                スケジュール機能は現在開発中です。
                下書きとして保存されました。
              </p>
              <button
                onClick={() => {
                  setShowScheduler(false)
                  router.push('/viral/drafts')
                }}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                下書き一覧へ
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}