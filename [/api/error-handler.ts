import { NextResponse } from 'next/server'
import { Prisma } from '@/lib/generated/prisma'

// API Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`
    super(message, 404, 'NOT_FOUND')
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}

// Environment variable validation
export function validateEnvVars(required: string[]): void {
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new ApiError(
      `Missing required environment variables: ${missing.join(', ')}`,
      500,
      'MISSING_ENV_VARS'
    )
  }
}

// Request validation
export async function validateParams(request: Request): Promise<any> {
  const url = new URL(request.url)
  const params: Record<string, string> = {}
  
  // Extract route params from URL
  const pathSegments = url.pathname.split('/').filter(Boolean)
  
  // Common pattern: /api/something/[id]/action
  // Extract id if present
  if (pathSegments.length >= 4 && pathSegments[2] !== 'undefined' && pathSegments[2] !== 'null') {
    params.id = pathSegments[2]
  }
  
  return params
}

// Error logging
async function logError(
  error: any,
  request: Request,
  prisma?: any
): Promise<void> {
  try {
    if (prisma) {
      const url = new URL(request.url)
      const headers = Object.fromEntries(request.headers.entries())
      
      await prisma.apiErrorLog.create({
        data: {
          endpoint: url.pathname,
          method: request.method,
          statusCode: error.statusCode || 500,
          errorMessage: error.message,
          stackTrace: error.stack,
          requestHeaders: headers,
          userAgent: headers['user-agent'],
          ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'],
        }
      })
    }
  } catch (logError) {
    console.error('Failed to log error:', logError)
  }
}

// Main error handler
export async function handleApiError(
  error: any,
  request?: Request,
  prisma?: any
): Promise<NextResponse> {
  console.error('API Error:', error)
  
  // Log to database if available
  if (request && prisma) {
    await logError(error, request, prisma)
  }
  
  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          { error: 'A record with this value already exists' },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        )
      default:
        return NextResponse.json(
          { error: 'Database error', code: error.code },
          { status: 500 }
        )
    }
  }
  
  // Handle API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && error.fields && { fields: error.fields })
      },
      { status: error.statusCode }
    )
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
  
  // Fallback
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  )
}

// Wrapper for API handlers
type ApiHandler = (request: Request, params?: any) => Promise<NextResponse>

export function withErrorHandling(
  handler: ApiHandler,
  options?: {
    requiredEnvVars?: string[]
    requireAuth?: boolean
    prisma?: any
  }
): ApiHandler {
  return async (request: Request) => {
    try {
      // Validate environment variables
      if (options?.requiredEnvVars) {
        validateEnvVars(options.requiredEnvVars)
      }
      
      // Validate params
      const params = await validateParams(request)
      
      // Check for undefined/null IDs
      if (params.id && (params.id === 'undefined' || params.id === 'null' || !params.id)) {
        throw new ValidationError('Invalid or missing ID parameter')
      }
      
      // Execute handler
      return await handler(request, params)
      
    } catch (error) {
      return handleApiError(error, request, options?.prisma)
    }
  }
}

// JSON parsing with error handling
export async function parseJsonBody<T = any>(request: Request): Promise<T> {
  try {
    const text = await request.text()
    if (!text) {
      return {} as T
    }
    return JSON.parse(text)
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body')
  }
}