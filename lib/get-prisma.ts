/**
 * Prismaクライアントの取得関数
 * Next.js 15.3のApp Routerでの互換性問題を回避
 */
import { PrismaClient } from './generated/prisma'

let prismaInstance: PrismaClient | undefined

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
    })
  }
  return prismaInstance
}

// グローバル変数として保存（開発時のホットリロード対策）
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  global.__prismaInstance = prismaInstance
}