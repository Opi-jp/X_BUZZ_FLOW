/**
 * Prisma Client 統一インスタンス
 * 
 * プロジェクト全体で使用するPrismaクライアントの統一管理
 * 接続プール、ログ設定、環境別設定を含む
 */

import { PrismaClient } from './generated/prisma'
export { PostType, PrismaClient } from './generated/prisma'

// グローバル型宣言（開発時のホットリロード対策）
declare global {
  var __prisma: PrismaClient | undefined
}

// 環境別設定
const isDevelopment = process.env.NODE_ENV === 'development'

// ログレベル設定
const logLevels: any = isDevelopment 
  ? ['query', 'info', 'warn', 'error']
  : ['error']

/**
 * Prismaクライアントの設定
 */
const prismaConfig: any = {
  log: logLevels,
  // エラーフォーマット設定
  errorFormat: isDevelopment ? 'pretty' : 'minimal',
}

/**
 * Prismaクライアント インスタンス
 * 
 * 開発時: グローバルインスタンスを再利用（ホットリロード対策）
 * 本番時: 新しいインスタンスを作成
 */
export const prisma = globalThis.__prisma || new PrismaClient(prismaConfig)

// 開発時のグローバルインスタンス保存
if (isDevelopment) {
  globalThis.__prisma = prisma
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
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(callback)
  } catch (error) {
    console.error('Transaction failed:', error)
    throw error
  }
}

/**
 * バッチ操作のヘルパー
 */
export async function executeBatch<T>(operations: T[]): Promise<T[]> {
  try {
    // @ts-ignore - Prisma transaction typing issue
    return await prisma.$transaction(operations)
  } catch (error) {
    console.error('Batch operation failed:', error)
    throw error
  }
}

// 開発時のデバッグ情報
if (isDevelopment) {
  console.log('🔌 Prisma Client initialized')
  console.log('📊 Log levels:', logLevels)
  console.log('🗄️ Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')
}

// プロセス終了時の接続切断
process.on('beforeExit', async () => {
  await disconnectPrisma()
})

// エラー時の接続切断
process.on('SIGINT', async () => {
  await disconnectPrisma()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await disconnectPrisma()
  process.exit(0)
})