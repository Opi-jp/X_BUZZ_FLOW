'use client'

import { useState } from 'react'
import { User, MessageCircle, Users } from 'lucide-react'

interface CharacterOption {
  id: string
  name: string
  displayName: string
  catchphrase: string
  personality: string
  emoji: string
  voiceStyle: {
    tone: string
    speakingStyle: string
    expertise: string
  }
}

interface CharacterSelectionStepProps {
  characters?: CharacterOption[]
  postFormat: 'single' | 'thread'
  onSelect: (characterId: string, postFormat: 'single' | 'thread') => void
  isLoading?: boolean
}

const DEFAULT_CHARACTERS: CharacterOption[] = [
  {
    id: 'cardi-dare',
    name: 'Cardi Dare',
    displayName: 'カーディ・ダーレ',
    catchphrase: '人間は最適化できない。それが救いだ。',
    personality: '元詐欺師／元王様（いまはただの飲んだくれ）。シニカルだが愛のある毒舌で、人間の弱さを肯定する。',
    emoji: '🃏',
    voiceStyle: {
      tone: 'シニカルだが温かみのある',
      speakingStyle: '皮肉と洞察を織り交ぜた',
      expertise: '人間の本質と社会の矛盾'
    }
  },
  {
    id: 'neutral',
    name: 'ニュートラル',
    displayName: 'ニュートラル',
    catchphrase: '事実とデータで語る、中立的な視点',
    personality: '感情を排して客観的に情報を伝える、信頼性重視のスタイル',
    emoji: '📊',
    voiceStyle: {
      tone: '冷静で客観的な',
      speakingStyle: '論理的で明確な',
      expertise: 'データ分析と客観的解説'
    }
  },
  {
    id: 'inspirational',
    name: 'インスピレーショナル',
    displayName: 'インスピレーショナル',
    catchphrase: '可能性を信じて、前に進もう',
    personality: 'ポジティブで励ましに満ちた、読者の背中を押すスタイル',
    emoji: '✨',
    voiceStyle: {
      tone: '明るく前向きな',
      speakingStyle: '励ましと共感に満ちた',
      expertise: 'モチベーションとポジティブ思考'
    }
  }
]

export function CharacterSelectionStep({ 
  characters = DEFAULT_CHARACTERS, 
  postFormat: initialFormat,
  onSelect, 
  isLoading 
}: CharacterSelectionStepProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string>('cardi-dare')
  const [postFormat, setPostFormat] = useState<'single' | 'thread'>(initialFormat)

  const handleSubmit = () => {
    onSelect(selectedCharacter, postFormat)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-purple-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <User className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">
              投稿キャラクターとフォーマット選択
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              投稿のトーンとスタイルを決定します
            </p>
          </div>
        </div>
      </div>

      {/* 投稿フォーマット選択 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">投稿フォーマット</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPostFormat('single')}
            disabled={isLoading}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${postFormat === 'single'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">シングル投稿</p>
                <p className="text-sm text-gray-600 mt-1">
                  280文字以内の単一投稿
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setPostFormat('thread')}
            disabled={isLoading}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              ${postFormat === 'thread'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">スレッド投稿</p>
                <p className="text-sm text-gray-600 mt-1">
                  複数投稿で詳細に展開
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* キャラクター選択 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">投稿キャラクター</h4>
        <div className="space-y-3">
          {characters.map((character) => (
            <button
              key={character.id}
              onClick={() => setSelectedCharacter(character.id)}
              disabled={isLoading}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${selectedCharacter === character.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{character.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {character.displayName}
                    </h4>
                    {character.id === 'cardi-dare' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        推奨
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 italic mb-2">
                    「{character.catchphrase}」
                  </p>
                  <p className="text-sm text-gray-700">
                    {character.personality}
                  </p>
                  
                  {/* 詳細情報 */}
                  {selectedCharacter === character.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">トーン</p>
                          <p className="text-gray-700">{character.voiceStyle.tone}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">話し方</p>
                          <p className="text-gray-700">{character.voiceStyle.speakingStyle}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">専門性</p>
                          <p className="text-gray-700">{character.voiceStyle.expertise}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 確認ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all
            ${!isLoading
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? '処理中...' : '投稿文を生成'}
        </button>
      </div>
    </div>
  )
}