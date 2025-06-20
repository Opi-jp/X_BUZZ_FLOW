import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

/**
 * リクエストからJSONボディを安全に取得
 */
export async function getRequestBody<T = any>(request: NextRequest): Promise<T | null> {
  try {
    const body = await request.json()
    return body
  } catch {
    return null
  }
}

/**
 * 認証チェック
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

/**
 * オプショナル認証チェック
 */
export async function getOptionalAuth() {
  try {
    const session = await getServerSession(authOptions)
    return session
  } catch {
    return null
  }
}

/**
 * APIレスポンスのヘッダー設定
 */
export function setCorsHeaders(response: Response): Response {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

/**
 * クエリパラメータの取得
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const { searchParams } = new URL(request.url)
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}

/**
 * ページネーション用のパラメータ取得
 */
export function getPaginationParams(request: NextRequest): {
  page: number
  limit: number
  skip: number
} {
  const params = getQueryParams(request)
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)))
  const skip = (page - 1) * limit
  
  return { page, limit, skip }
}

/**
 * 成功レスポンス
 */
export function successResponse<T = any>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

/**
 * エラーレスポンス
 */
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      error: true,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}