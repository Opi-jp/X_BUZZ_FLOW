import { NextResponse, NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export interface ErrorResponse {
  error: string
  message: string
  details?: any
  timestamp: string
}

export class APIError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 404, details)
    this.name = 'NotFoundError'
  }
}

/**
 * 統一的なエラーハンドリング
 */
export function handleAPIError(error: unknown): NextResponse<ErrorResponse> {
  console.error('[API Error]', error)

  // Zodバリデーションエラー
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: 'リクエストデータが無効です',
        details: error.errors,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  // Prismaエラー
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Duplicate Entry',
          message: '既に存在するデータです',
          details: error.meta,
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      )
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: '指定されたデータが見つかりません',
          details: error.meta,
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }
  }

  // カスタムAPIエラー
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.name,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    )
  }

  // その他のエラー
  const message = error instanceof Error ? error.message : 'サーバーエラーが発生しました'
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  )
}

/**
 * エラーハンドリングミドルウェア
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleAPIError(error) as any
    }
  }
}