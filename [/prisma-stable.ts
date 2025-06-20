import { PrismaClient } from '@/lib/generated/prisma'

// シングルトンパターンでPrismaClientを管理
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaDirect: PrismaClient | undefined
}

// 接続プール設定を最適化
const poolConfig = {
  // 接続プールサイズ
  connection_limit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10'),
  // プールタイムアウト設定
  pool_timeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '10'),
  // アイドルタイムアウト
  idle_in_transaction_session_timeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30'),
  // ステートメントタイムアウト
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30'),
}

// メインのPrismaClient（プール接続）
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] // クエリログを削除してパフォーマンス向上
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Direct接続用クライアント（マイグレーション、単一トランザクション用）
export const prismaDirect = globalForPrisma.prismaDirect ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
})

// 開発環境でのみグローバルに保存
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaDirect = prismaDirect
}

/**
 * データベースのヘルスチェック
 */
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean
  pooled: boolean
  direct: boolean
  error?: string
}> {
  const result = {
    isHealthy: false,
    pooled: false,
    direct: false,
    error: undefined as string | undefined
  }

  try {
    // プール接続のチェック
    await prisma.$queryRaw`SELECT 1 as check`
    result.pooled = true
  } catch (error) {
    console.error('[DB] Pooled connection health check failed:', error)
    result.error = error instanceof Error ? error.message : 'Unknown error'
  }

  try {
    // Direct接続のチェック
    if (process.env.DIRECT_URL) {
      await prismaDirect.$queryRaw`SELECT 1 as check`
      result.direct = true
    }
  } catch (error) {
    console.error('[DB] Direct connection health check failed:', error)
  }

  result.isHealthy = result.pooled
  return result
}

/**
 * グレースフルシャットダウン
 */
export async function disconnectDB(): Promise<void> {
  try {
    await Promise.all([
      prisma.$disconnect(),
      prismaDirect.$disconnect()
    ])
    console.log('[DB] All database connections closed')
  } catch (error) {
    console.error('[DB] Error during disconnect:', error)
  }
}

/**
 * 接続リトライラッパー
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    delay?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, onRetry } = options
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      if (error instanceof Error && error.message.includes('P2024')) {
        // プールタイムアウトエラーの場合
        console.warn(`[DB] Pool timeout on attempt ${attempt}, retrying...`)
      }
      
      if (onRetry) {
        onRetry(attempt, error as Error)
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw new Error('Should not reach here')
}

// プロセス終了時のクリーンアップ
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await disconnectDB()
  })
  
  process.on('SIGINT', async () => {
    await disconnectDB()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await disconnectDB()
    process.exit(0)
  })
}