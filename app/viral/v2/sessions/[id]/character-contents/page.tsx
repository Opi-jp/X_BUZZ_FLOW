'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CharacterContent {
  id: string
  title: string
  content: string
  hashtags: string[]
  characterNote?: string
  sourceUrl?: string
  conceptId?: string
}

interface Character {
  id: string
  name: string
  catchphrase: string
}

interface Session {
  id: string
  theme: string
  status: string
  characterProfileId?: string
  voiceStyleMode?: string
}

export default function CharacterContentsPage() {
  const params = useParams()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [contents, setContents] = useState<CharacterContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSession()
    fetchCharacterContents()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/viral/v2/sessions/${sessionId}`)
      const data = await response.json()
      if (response.ok) {
        setSession(data.session)
      }
    } catch (err: any) {
      console.error('Failed to fetch session:', err)
    }
  }

  const fetchCharacterContents = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/viral/v2/sessions/${sessionId}/drafts`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch character contents')
      }
      
      setContents(data.drafts || [])
      if (data.character) {
        setCharacter(data.character)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getCharacterLength = (content: string) => {
    // 改行を除去してカウント
    return content.replace(/\n/g, '').length
  }

  const isWithinLimit = (content: string) => {
    const length = getCharacterLength(content)
    return length >= 100 && length <= 140
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-500">キャラクターコンテンツを読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          エラー: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href={`/viral/v2/sessions/${sessionId}`} className="text-indigo-600 hover:text-indigo-800">
          ← セッション詳細に戻る
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">キャラクターコンテンツ生成結果</h1>
      
      {session && (
        <div className="mb-6 text-gray-600">
          <p>テーマ: {session.theme}</p>
          <p>ステータス: {session.status}</p>
        </div>
      )}

      {character && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">{character.name}</h2>
          <p className="text-gray-600 italic">"{character.catchphrase}"</p>
        </div>
      )}

      <div className="space-y-6">
        {contents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            キャラクターコンテンツがまだ生成されていません
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              生成されたコンテンツ: {contents.length}件
            </div>
            {contents.map((content, index) => (
              <div key={content.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">
                    コンテンツ {index + 1}
                  </h3>
                  <div className={`text-sm px-2 py-1 rounded ${
                    isWithinLimit(content.content) 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {getCharacterLength(content.content)}文字
                  </div>
                </div>
                
                <div className="prose max-w-none mb-4">
                  <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded">
                    {content.content}
                  </p>
                </div>

                {content.hashtags && content.hashtags.length > 0 && (
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">ハッシュタグ: </span>
                    {content.hashtags.map((tag, i) => (
                      <span key={i} className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded mr-2">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {content.characterNote && (
                  <div className="text-sm text-gray-600 italic mb-2">
                    キャラクターノート: {content.characterNote}
                  </div>
                )}
                
                {content.sourceUrl && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      引用元記事（ツリーで投稿）:
                    </p>
                    <a 
                      href={content.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {content.sourceUrl}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}