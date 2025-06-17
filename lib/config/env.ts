/**
 * 環境変数の統合管理
 * 
 * 全ての環境変数をここで定義し、型安全性とフォールバックを提供
 */

import { z } from 'zod'

// 環境変数のスキーマ定義
const envSchema = z.object({
  // データベース（必須）
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  
  // NextAuth（必須）
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(1),
  
  // Twitter API（実行時必須、ビルド時オプション）
  TWITTER_API_KEY: process.env.VERCEL ? z.string().optional() : z.string().min(1),
  TWITTER_API_SECRET: process.env.VERCEL ? z.string().optional() : z.string().min(1),
  TWITTER_ACCESS_TOKEN: process.env.VERCEL ? z.string().optional() : z.string().min(1),
  TWITTER_ACCESS_SECRET: process.env.VERCEL ? z.string().optional() : z.string().min(1),
  
  // Twitter OAuth（オプション）
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  
  // AI APIs（オプション - デモモードあり）
  OPENAI_API_KEY: z.string().default('demo'),
  CLAUDE_API_KEY: z.string().default('demo'),
  PERPLEXITY_API_KEY: z.string().default('demo'),
  
  // News API（オプション）
  NEWSAPI_KEY: z.string().optional(),
  
  // Google API（オプション）
  GOOGLE_API_KEY: z.string().optional(),
  GOOGLE_SEARCH_ENGINE_ID: z.string().optional(),
  
  // Vercel（オプション）
  VERCEL_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  
  // 環境
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// 環境変数の読み込みとバリデーション
function loadEnv() {
  try {
    // .envファイルの読み込み（開発環境のみ）
    if (process.env.NODE_ENV !== 'production') {
      require('dotenv').config({ path: '.env.local' })
      require('dotenv').config({ path: '.env' })
    }
    
    // スキーマでバリデーション
    const parsed = envSchema.safeParse(process.env)
    
    if (!parsed.success) {
      const missingVars = parsed.error.issues
        .filter(issue => issue.code === 'invalid_type' && issue.received === 'undefined')
        .map(issue => issue.path.join('.'))
      
      const invalidVars = parsed.error.issues
        .filter(issue => issue.code !== 'invalid_type' || issue.received !== 'undefined')
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      
      console.error('❌ 環境変数エラー:')
      
      if (missingVars.length > 0) {
        console.error('\n必須の環境変数が設定されていません:')
        missingVars.forEach(v => console.error(`  - ${v}`))
      }
      
      if (invalidVars.length > 0) {
        console.error('\n無効な環境変数:')
        invalidVars.forEach(v => console.error(`  - ${v}`))
      }
      
      console.error('\n💡 ヒント:')
      console.error('1. .env.localファイルに環境変数を設定してください')
      console.error('2. .env.exampleを参考にしてください')
      console.error('3. Vercelの場合は管理画面で設定してください')
      
      // ビルド時は警告のみ、実行時のみエラー
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
        throw new Error('環境変数の設定が不完全です')
      }
    }
    
    return parsed.success ? parsed.data : process.env as any
  } catch (error) {
    console.error('環境変数の読み込みに失敗しました:', error)
    // フォールバックとして最小限の設定を返す
    return process.env as any
  }
}

// 環境変数をエクスポート
export const env = loadEnv()

// 環境チェック関数
export function checkRequiredEnvVars(required: string[]): {
  valid: boolean
  missing: string[]
  warnings: string[]
} {
  const missing: string[] = []
  const warnings: string[] = []
  
  for (const key of required) {
    const value = (env as any)[key]
    
    if (!value || value === 'demo') {
      if (value === 'demo') {
        warnings.push(`${key} is in demo mode`)
      } else {
        missing.push(key)
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

// 環境変数の状態を表示
export function printEnvStatus() {
  console.log('\n📊 環境変数の状態:\n')
  
  const groups = {
    '🗄️  データベース': ['DATABASE_URL', 'DIRECT_URL'],
    '🔐 認証': ['NEXTAUTH_URL', 'NEXTAUTH_SECRET'],
    '🐦 Twitter': ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'],
    '🤖 AI': ['OPENAI_API_KEY', 'CLAUDE_API_KEY', 'PERPLEXITY_API_KEY'],
    '📰 外部API': ['NEWSAPI_KEY', 'GOOGLE_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID'],
    '☁️  Vercel': ['VERCEL_URL', 'CRON_SECRET']
  }
  
  for (const [groupName, keys] of Object.entries(groups)) {
    console.log(groupName)
    for (const key of keys) {
      const value = (env as any)[key]
      const status = !value ? '❌ 未設定' : 
                    value === 'demo' ? '⚠️  デモモード' : 
                    '✅ 設定済み'
      console.log(`  ${status} ${key}`)
    }
    console.log()
  }
}

// APIキーが本番用かチェック
export function isProductionReady(): boolean {
  const productionKeys = [
    'OPENAI_API_KEY',
    'CLAUDE_API_KEY',
    'PERPLEXITY_API_KEY'
  ]
  
  return productionKeys.every(key => {
    const value = (env as any)[key]
    return value && value !== 'demo'
  })
}

// 型定義
export type Env = z.infer<typeof envSchema>