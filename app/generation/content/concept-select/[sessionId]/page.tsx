'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import ConceptSelector from '@/app/components/generation/ConceptSelector'
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react'

interface Session {
  id: string
  theme: string
  platform: string
  style: string
  perplexityData: any
  concepts: any[]
  claudeData: any
  status: string
  currentPhase: string
}

export default function ConceptSelectPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/generation/content/sessions/${sessionId}`)
      if (!response.ok) throw new Error('セッションの取得に失敗しました')
      
      const data = await response.json()
      setSession(data.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleConceptSelection = async (selectedIds: string[]) => {
    if (!session) return
    
    setProcessing(true)
    setError(null)

    try {
      // 選択されたコンセプトを保存
      const response = await fetch(`/api/generation/content/sessions/${sessionId}/concepts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedConceptIds: selectedIds
        })
      })

      if (!response.ok) {
        throw new Error('コンセプトの選択保存に失敗しました')
      }

      // Claude生成フェーズへ進む
      router.push(`/generation/content/character-select/${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold text-red-900">エラー</h3>
          </div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchSession}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (!session || !session.concepts || session.concepts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">コンセプトが見つかりません</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">コンセプト選択</h1>
              <p className="mt-1 text-gray-600">
                生成されたコンセプトから投稿したいものを選択してください
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">セッションID</p>
              <p className="font-mono text-xs text-gray-600">{sessionId}</p>
            </div>
          </div>

          {/* 進捗インジケーター */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm text-gray-700">トピック収集</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm text-gray-700">コンセプト生成</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  3
                </div>
                <span className="ml-2 text-sm font-semibold text-gray-900">コンセプト選択</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm">
                  4
                </div>
                <span className="ml-2 text-sm text-gray-500">キャラクター選択</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm">
                  5
                </div>
                <span className="ml-2 text-sm text-gray-500">投稿生成</span>
              </div>
            </div>
          </div>
        </div>

        {/* セッション情報 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">テーマ:</span>
              <span className="ml-2 font-medium">{session.theme}</span>
            </div>
            <div>
              <span className="text-gray-600">プラットフォーム:</span>
              <span className="ml-2 font-medium">{session.platform}</span>
            </div>
            <div>
              <span className="text-gray-600">スタイル:</span>
              <span className="ml-2 font-medium">{session.style}</span>
            </div>
          </div>
        </div>

        {/* コンセプトセレクター */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <ConceptSelector
            concepts={session.concepts}
            onSelect={handleConceptSelection}
            maxSelections={3}
          />
        </div>

        {processing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-700">選択を保存中...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}