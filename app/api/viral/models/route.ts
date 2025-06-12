import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// キャッシュ用
let cachedModels: any = null
let cacheTimestamp = 0
const CACHE_DURATION = 1000 * 60 * 60 * 24 // 24時間

export async function GET() {
  try {
    // キャッシュが有効な場合は使用
    if (cachedModels && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({ models: cachedModels })
    }

    // OpenAI APIから利用可能なモデルを取得
    const modelsResponse = await openai.models.list()
    const allModels = modelsResponse.data

    // チャット用モデルのみをフィルタリング
    const chatModels = allModels
      .filter(model => 
        model.id.includes('gpt') || 
        model.id.includes('o1') ||
        model.id.includes('o3')
      )
      .filter(model => 
        !model.id.includes('instruct') && 
        !model.id.includes('vision') &&
        !model.id.includes('audio') &&
        !model.id.includes('realtime')
      )
      .sort((a, b) => {
        // 推奨順にソート
        const priority: Record<string, number> = {
          'o3-mini': 1,
          'o1-preview': 2,
          'o1-mini': 3,
          'gpt-4o': 4,
          'gpt-4o-mini': 5,
          'gpt-4-turbo': 6,
          'gpt-4': 7,
          'gpt-3.5-turbo': 8,
        }
        
        const aPriority = Object.entries(priority).find(([key]) => a.id.includes(key))?.[1] || 999
        const bPriority = Object.entries(priority).find(([key]) => b.id.includes(key))?.[1] || 999
        
        return aPriority - bPriority
      })
      .map(model => {
        // 表示名を生成
        let displayName = model.id
        let description = ''
        
        if (model.id.includes('o3-mini')) {
          displayName = 'o3 Mini'
          description = '最新の高速推論モデル'
        } else if (model.id.includes('o1-preview')) {
          displayName = 'o1 Preview'
          description = '最先端の推論モデル'
        } else if (model.id.includes('o1-mini')) {
          displayName = 'o1 Mini'
          description = '高速推論モデル'
        } else if (model.id.includes('gpt-4o') && !model.id.includes('mini')) {
          displayName = 'GPT-4o'
          description = '最新・推奨'
        } else if (model.id.includes('gpt-4o-mini')) {
          displayName = 'GPT-4o Mini'
          description = '高速・コスト効率'
        } else if (model.id.includes('gpt-4-turbo')) {
          displayName = 'GPT-4 Turbo'
          description = '高性能'
        } else if (model.id === 'gpt-4') {
          displayName = 'GPT-4'
          description = '従来版'
        } else if (model.id.includes('gpt-3.5-turbo')) {
          displayName = 'GPT-3.5 Turbo'
          description = '旧モデル・低コスト'
        }

        return {
          id: model.id,
          displayName,
          description,
          created: model.created
        }
      })

    // キャッシュを更新
    cachedModels = chatModels
    cacheTimestamp = Date.now()

    return NextResponse.json({ 
      models: chatModels,
      cached: false,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to fetch models:', error)
    
    // エラー時はフォールバックのモデルリストを返す
    const fallbackModels = [
      { id: 'gpt-4o', displayName: 'GPT-4o', description: '最新・推奨' },
      { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', description: '高速・コスト効率' },
      { id: 'gpt-4-turbo-preview', displayName: 'GPT-4 Turbo', description: '高性能' },
      { id: 'gpt-4', displayName: 'GPT-4', description: '従来版' },
      { id: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', description: '旧モデル・低コスト' }
    ]
    
    return NextResponse.json({ 
      models: fallbackModels,
      fallback: true,
      error: 'Failed to fetch models from OpenAI'
    })
  }
}