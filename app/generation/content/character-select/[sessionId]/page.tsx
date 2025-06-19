'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { AlertCircle, Loader2, ArrowRight, User, Crown } from 'lucide-react'

interface Character {
  id: string
  name: string
  description: string
  icon?: string
  premium?: boolean
}

const AVAILABLE_CHARACTERS: Character[] = [
  {
    id: 'cardi-dare',
    name: 'カーディ・ダーレ',
    description: '元詐欺師／元王様（いまはただの飲んだくれ）。53歳。人間は最適化できない。それが救いだ。',
    icon: '👑'
  },
  {
    id: 'default',
    name: 'スタンダード',
    description: 'ニュートラルで親しみやすいトーン。情報を分かりやすく伝える。',
    icon: '📝'
  }
]

interface Session {
  id: string
  theme: string
  platform: string
  style: string
  selectedConcepts: any[]
  status: string
  currentPhase: string
}

export default function CharacterSelectPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
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

  const handleGenerateContent = async () => {
    if (!session || !selectedCharacter) return
    
    setProcessing(true)
    setError(null)

    try {
      // 投稿生成を開始
      const response = await fetch(`/api/generation/content/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: selectedCharacter
        })
      })

      if (!response.ok) {
        throw new Error('投稿生成の開始に失敗しました')
      }

      // 結果ページへ遷移
      router.push(`/generation/content/result/${sessionId}`)
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

  if (!session || !session.selectedConcepts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">選択されたコンセプトが見つかりません</p>
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
              <h1 className="text-2xl font-bold text-gray-900">キャラクター選択</h1>
              <p className="mt-1 text-gray-600">
                投稿のトーンを決めるキャラクターを選択してください
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
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  ✓
                </div>
                <span className="ml-2 text-sm text-gray-700">コンセプト選択</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  4
                </div>
                <span className="ml-2 text-sm font-semibold text-gray-900">キャラクター選択</span>
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

        {/* 選択されたコンセプト */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">選択されたコンセプト</h3>
          <div className="flex flex-wrap gap-2">
            {session.selectedConcepts.map((concept: any) => (
              <div
                key={concept.conceptId}
                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                {concept.conceptTitle}
              </div>
            ))}
          </div>
        </div>

        {/* キャラクター選択 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {AVAILABLE_CHARACTERS.map((character) => (
              <div
                key={character.id}
                onClick={() => setSelectedCharacter(character.id)}
                className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  selectedCharacter === character.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{character.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {character.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {character.description}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {selectedCharacter === character.id ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleGenerateContent}
              disabled={!selectedCharacter || processing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  投稿を生成する
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {processing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center max-w-md">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">投稿を生成中...</h3>
              <p className="text-gray-600">
                選択された{session.selectedConcepts.length}個のコンセプトから
                投稿を生成しています
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}