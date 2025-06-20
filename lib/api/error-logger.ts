/**
 * APIエラーロギングミドルウェア
 * 
 * バックエンドエラーを自動的にログファイルに記録
 */

import fs from 'fs'
import path from 'path'

const LOG_DIR = 'logs'
const LOG_FILE = path.join(LOG_DIR, 'backend-errors.log')

// ログディレクトリの作成
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

export interface ApiError {
  timestamp: string
  method: string
  url: string
  status: number
  error: string
  stack?: string
  body?: any
  headers?: any
}

/**
 * エラーをログファイルに記録
 */
export function logApiError(error: ApiError): void {
  try {
    const logEntry = JSON.stringify({
      ...error,
      timestamp: new Date().toISOString()
    }) + '\n'
    
    fs.appendFileSync(LOG_FILE, logEntry)
    
    // コンソールにも出力（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 API Error:', {
        url: error.url,
        error: error.error,
        status: error.status
      })
    }
  } catch (e) {
    console.error('Failed to log API error:', e)
  }
}

/**
 * APIルートエラーハンドラー
 */
export function withErrorLogging<T extends (...args: any[]) => any>(
  handler: T,
  route: string
): T {
  return (async (...args: Parameters<T>) => {
    const [request] = args
    
    try {
      return await handler(...args)
    } catch (error) {
      // エラーをログに記録
      logApiError({
        timestamp: new Date().toISOString(),
        method: request?.method || 'UNKNOWN',
        url: route,
        status: 500,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        body: request?.body,
        headers: request?.headers
      })
      
      // エラーを再スロー
      throw error
    }
  }) as T
}

/**
 * Prismaエラーの詳細ログ
 */
export function logPrismaError(error: any, operation: string): void {
  const errorDetails: any = {
    timestamp: new Date().toISOString(),
    operation,
    type: 'PrismaError',
    code: error.code,
    meta: error.meta,
    message: error.message,
    clientVersion: error.clientVersion
  }
  
  // Prisma特有のエラーコード
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        errorDetails.hint = 'Unique constraint violation'
        break
      case 'P2003':
        errorDetails.hint = 'Foreign key constraint violation'
        break
      case 'P2025':
        errorDetails.hint = 'Record not found'
        break
      case 'P1001':
        errorDetails.hint = 'Cannot reach database server'
        break
    }
  }
  
  logApiError({
    timestamp: errorDetails.timestamp,
    method: 'PRISMA',
    url: operation,
    status: 500,
    error: JSON.stringify(errorDetails)
  })
}