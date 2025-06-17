'use client'

import { useState } from 'react'
import { CharacterSelector } from '../../../../components/character-selector'
import type { VoiceStyleMode } from '../../../../types/character'

export default function TestCharacterPage() {
  const [sessionId, setSessionId] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState<{
    id: string
    voiceMode: VoiceStyleMode
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleCharacterSelect = (characterId: string, voiceMode: VoiceStyleMode) => {
    setSelectedCharacter({ id: characterId, voiceMode })
    setError('')
  }

  const generateContents = async () => {
    if (!sessionId || !selectedCharacter) {
      setError('セッションIDとキャラクターを選択してください')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch(`/api/viral/v2/sessions/${sessionId}/generate-character-contents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: selectedCharacter.id,
          voiceStyleMode: selectedCharacter.voiceMode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate contents')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">V2 キャラクターコンテンツ生成テスト</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            セッションID
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="既存のV2セッションIDを入力"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            事前に /api/viral/v2/sessions でセッションを作成し、generate-concepts APIでコンセプトを生成してください
          </p>
        </div>

        <CharacterSelector 
          onSelect={handleCharacterSelect}
          disabled={loading}
        />

        {selectedCharacter && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm">
              選択中: <strong>{selectedCharacter.id}</strong> / 
              モード: <strong>{selectedCharacter.voiceMode}</strong>
            </p>
          </div>
        )}

        <button
          onClick={generateContents}
          disabled={loading || !sessionId || !selectedCharacter}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? '生成中...' : 'キャラクターコンテンツを生成'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-green-800">生成完了！</h3>
            <div>
              <p className="text-sm text-gray-600">
                キャラクター: <strong>{result.character.name}</strong> - {result.character.catchphrase}
              </p>
              <p className="text-sm text-gray-600">
                生成数: <strong>{result.generatedCount}件</strong>
              </p>
            </div>
            
            {result.drafts && (
              <div className="space-y-3">
                <h4 className="font-medium">生成された下書き:</h4>
                {result.drafts.map((draft: any, index: number) => {
                  const mainText = draft.content.split('#')[0].trim()
                  const charCount = mainText.length
                  const isValidLength = charCount >= 100 && charCount <= 118
                  
                  return (
                    <div key={draft.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-gray-700">下書き {index + 1}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          isValidLength 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {charCount}文字 {isValidLength ? '✓' : '！'}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded mb-2">
                        <p className="text-sm whitespace-pre-wrap">{draft.content}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {draft.hashtags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      
                      {draft.title && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          タイトル: {draft.title}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}