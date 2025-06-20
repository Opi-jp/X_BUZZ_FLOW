/**
 * キャラクター情報ローダー
 * JSONファイルからキャラクター情報を読み込む
 */

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export interface Character {
  id: string
  name: string
  description: string
  age?: number
  background?: string
  philosophy?: string
  personality?: string
  tone?: string
  traits?: string
}

/**
 * すべての利用可能なキャラクターを取得
 */
export async function getAvailableCharacters(): Promise<Character[]> {
  try {
    const charactersDir = join(process.cwd(), 'lib', 'prompts', 'characters')
    const files = await readdir(charactersDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    
    const characters: Character[] = []
    
    for (const file of jsonFiles) {
      try {
        const content = await readFile(join(charactersDir, file), 'utf-8')
        const character = JSON.parse(content)
        characters.push(character)
      } catch (error) {
        console.error(`Failed to load character from ${file}:`, error)
      }
    }
    
    return characters
  } catch (error) {
    console.error('Failed to load characters:', error)
    // デフォルトキャラクターを返す
    return [
      {
        id: 'neutral',
        name: 'ニュートラル',
        description: '親しみやすく分かりやすいトーン'
      }
    ]
  }
}

/**
 * 特定のキャラクターを取得
 */
export async function getCharacter(characterId: string): Promise<Character | null> {
  try {
    const characterPath = join(process.cwd(), 'lib', 'prompts', 'characters', `${characterId}.json`)
    const content = await readFile(characterPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`Failed to load character ${characterId}:`, error)
    return null
  }
}