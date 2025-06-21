/**
 * データベース接続の統一管理
 * Next.js 15.3 App Routerとの互換性を確保
 */
import { PrismaClient } from '@prisma/client'

// グローバル型定義
declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient | undefined
}

let cached = global.cachedPrisma

if (!cached) {
  cached = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  })
  global.cachedPrisma = cached
}

export const db = cached

// エイリアスとしてprismaもエクスポート
export const prisma = db

// 型のエクスポート
export { PrismaClient } from '@prisma/client'