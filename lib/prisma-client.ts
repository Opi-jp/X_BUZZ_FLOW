/**
 * Prismaクライアントのシングルトンインスタンス
 * Next.js 15.3 App Router対応版
 */
import { PrismaClient as PrismaClientType } from '@/lib/generated/prisma'

// Node.jsのrequireを使用して動的にインポート
const { PrismaClient } = require('@/lib/generated/prisma')

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

// 既存のインスタンスがあればそれを使用、なければ新規作成
export const prisma: PrismaClientType =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// デフォルトエクスポートも提供
export default prisma