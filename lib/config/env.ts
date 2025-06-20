/**
 * 環境変数の設定と検証
 */

// 必須の環境変数
export const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'PERPLEXITY_API_KEY',
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
] as const

// オプションの環境変数
export const optionalEnvVars = [
  'GOOGLE_API_KEY',
  'GOOGLE_SEARCH_ENGINE_ID',
  'USE_MOCK_POSTING',
  'VERCEL_URL',
] as const

/**
 * 環境変数の型定義
 */
export interface EnvConfig {
  // Database
  DATABASE_URL: string
  DIRECT_URL: string
  
  // AI APIs
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
  PERPLEXITY_API_KEY: string
  
  // Twitter OAuth
  TWITTER_CLIENT_ID: string
  TWITTER_CLIENT_SECRET: string
  
  // NextAuth
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string
  
  // Optional
  GOOGLE_API_KEY?: string
  GOOGLE_SEARCH_ENGINE_ID?: string
  USE_MOCK_POSTING?: string
  VERCEL_URL?: string
}

/**
 * 環境変数を取得・検証
 */
export function getEnvConfig(): EnvConfig {
  const config: Partial<EnvConfig> = {}
  const missingVars: string[] = []

  // 必須環境変数のチェック
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]
    if (!value) {
      missingVars.push(envVar)
    } else {
      (config as any)[envVar] = value
    }
  }

  // 不足している環境変数がある場合はエラー
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }

  // オプション環境変数の追加
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar]
    if (value) {
      (config as any)[envVar] = value
    }
  }

  return config as EnvConfig
}

/**
 * 開発環境かどうか
 */
export const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * 本番環境かどうか
 */
export const isProduction = process.env.NODE_ENV === 'production'

/**
 * モック投稿モードかどうか
 */
export const useMockPosting = process.env.USE_MOCK_POSTING === 'true'

/**
 * ベースURL取得
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  return 'http://localhost:3000'
}

// エクスポート用のenv定数
export const env = {
  isDevelopment,
  isProduction,
  useMockPosting,
  getBaseUrl,
  ...getEnvConfig()
}