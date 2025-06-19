import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from './types'

/**
 * API共通ユーティリティ関数
 */

// 認証チェック
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new AuthError('Unauthorized')
  }
  return session
}

// エラーレスポンス生成
export function errorResponse(
  error: any,
  statusCode: number = 500
): NextResponse<ApiResponse> {
  console.error('[API Error]', error)
  
  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    )
  }
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { success: false, error: error.message, details: error.details },
      { status: 400 }
    )
  }
  
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: statusCode }
  )
}

// 成功レスポンス生成
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, message },
    { status: statusCode }
  )
}

// データ変換: Raw → Display
export function toDisplayData(rawData: any, fields: string[]): any {
  const display: any = {}
  fields.forEach(field => {
    if (rawData[field] !== undefined) {
      display[field] = rawData[field]
    }
  })
  return display
}

// サマリー生成
export function generateSummary(text: string, maxLength: number = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// カスタムエラークラス
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

// レート制限チェック（簡易版）
const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(identifier) || []
  
  // 古いリクエストを削除
  const validRequests = requests.filter(time => now - time < windowMs)
  
  if (validRequests.length >= maxRequests) {
    return false
  }
  
  validRequests.push(now)
  rateLimitMap.set(identifier, validRequests)
  return true
}