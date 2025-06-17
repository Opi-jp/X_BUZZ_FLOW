'use client'

import { useState } from 'react'
import { DEFAULT_CHARACTERS } from '../types/character'
import type { CharacterProfile, VoiceStyleMode } from '../types/character'

interface CharacterSelectorProps {
  onSelect: (characterId: string, voiceMode: VoiceStyleMode) => void
  disabled?: boolean
}

export function CharacterSelector({ onSelect, disabled }: CharacterSelectorProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<string>('')
  const [voiceMode, setVoiceMode] = useState<VoiceStyleMode>('normal')

  const handleCharacterChange = (characterId: string) => {
    setSelectedCharacter(characterId)
    if (characterId) {
      onSelect(characterId, voiceMode)
    }
  }

  const handleVoiceModeChange = (mode: VoiceStyleMode) => {
    setVoiceMode(mode)
    if (selectedCharacter) {
      onSelect(selectedCharacter, mode)
    }
  }

  const selectedChar = DEFAULT_CHARACTERS.find(c => c.id === selectedCharacter)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          キャラクターを選択
        </label>
        <select
          value={selectedCharacter}
          onChange={(e) => handleCharacterChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">キャラクターを選択してください</option>
          {DEFAULT_CHARACTERS.map((char) => (
            <option key={char.id} value={char.id}>
              {char.name} ({char.age}歳) - {char.catchphrase}
            </option>
          ))}
        </select>
      </div>

      {selectedChar && (
        <>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">{selectedChar.name}</h4>
            <p className="text-sm text-gray-600 mb-2">{selectedChar.tone}</p>
            {selectedChar.philosophy && (
              <p className="text-sm italic text-gray-500">
                「{selectedChar.philosophy}」
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              声のスタイル
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="normal"
                  checked={voiceMode === 'normal'}
                  onChange={(e) => handleVoiceModeChange(e.target.value as VoiceStyleMode)}
                  className="mr-2"
                  disabled={disabled}
                />
                <span className="text-sm">
                  通常 - {selectedChar.voice_style.normal}
                </span>
              </label>
              {selectedChar.voice_style.emotional && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="emotional"
                    checked={voiceMode === 'emotional'}
                    onChange={(e) => handleVoiceModeChange(e.target.value as VoiceStyleMode)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  <span className="text-sm">
                    感情的 - {selectedChar.voice_style.emotional}
                  </span>
                </label>
              )}
              {selectedChar.voice_style.humorous && (
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="humorous"
                    checked={voiceMode === 'humorous'}
                    onChange={(e) => handleVoiceModeChange(e.target.value as VoiceStyleMode)}
                    className="mr-2"
                    disabled={disabled}
                  />
                  <span className="text-sm">
                    ユーモラス - {selectedChar.voice_style.humorous}
                  </span>
                </label>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}