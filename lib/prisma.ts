/**
 * Prisma Client 統一インスタンス
 * 
 * Next.js 15.3 App Router対応版
 * 環境変数の明示的な読み込みとデバッグログ付き
 */

// 環境変数の読み込みを最初に行う
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

// 環境変数の検証
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

import { PrismaClient } from '@/lib/generated/prisma'
export { PostType } from '@/lib/generated/prisma'

// グローバル型宣言（開発時のホットリロード対策）
declare global {
  var __prisma: PrismaClient | undefined
  var __prismaPromise: Promise<PrismaClient> | undefined
}

// 環境別設定
const isDevelopment = process.env.NODE_ENV === 'development'

// ログレベル設定
const logLevels = isDevelopment 
  ? ['error', 'warn'] // queryログは大量になるので開発時も抑制
  : ['error']

/**
 * Prismaクライアントの設定
 */
const prismaConfig = {
  log: logLevels as any,
  errorFormat: isDevelopment ? 'pretty' : 'minimal',
} as const

/**
 * Prismaクライアントの作成（遅延初期化）
 */
function createPrismaClient(): PrismaClient {
  console.log('🔄 Creating new Prisma Client instance...')
  console.log('📊 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
  console.log('🔧 Environment:', process.env.NODE_ENV)
  
  const client = new PrismaClient(prismaConfig)
  
  // 接続テスト
  client.$connect()
    .then(() => {
      console.log('✅ Prisma Client connected successfully')
    })
    .catch((error) => {
      console.error('❌ Prisma Client connection failed:', error)
    })
  
  return client
}

/**
 * シングルトンインスタンスの取得
 * Next.js 15.3のホットリロードに対応
 */
function getPrismaClient(): PrismaClient {
  if (!isDevelopment) {
    // 本番環境では常に新しいインスタンス
    return createPrismaClient()
  }
  
  // 開発環境ではグローバルインスタンスを再利用
  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient()
  }
  
  return globalThis.__prisma
}

// Prismaクライアント インスタンス
export const prisma = getPrismaClient()

// デバッグ情報を出力
if (isDevelopment) {
  console.log('🔌 Prisma Client exported')
  console.log('📝 Available models:', Object.keys(prisma).filter(key => !key.startsWith('$')))
}

/**
 * Prisma接続のヘルスチェック
 */
export async function checkPrismaConnection(): Promise<{
  status: 'connected' | 'disconnected' | 'error'
  message?: string
  responseTime?: number
}> {
  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime
    
    return {
      status: 'connected',
      responseTime,
      message: `Connected in ${responseTime}ms`
    }
  } catch (error) {
    console.error('Prisma connection check failed:', error)
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown connection error'
    }
  }
}

/**
 * 安全にPrisma接続を切断
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('✅ Prisma client disconnected successfully')
  } catch (error) {
    console.error('❌ Error disconnecting Prisma client:', error)
  }
}

/**
 * トランザクション実行のヘルパー
 */
export async function executeTransaction<T>(
  callback: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(callback)
  } catch (error) {
    console.error('Transaction failed:', error)
    throw error
  }
}

// プロセス終了時の接続切断
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectPrisma()
  })
  
  process.on('SIGINT', async () => {
    await disconnectPrisma()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await disconnectPrisma()
    process.exit(0)
  })
}