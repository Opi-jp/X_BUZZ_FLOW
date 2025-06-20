/**
 * API契約定義 - フロントエンド↔バックエンド間の統一インターフェース
 * 
 * この ファイルはフロントとバックの両方で使用し、
 * 関数定義の不一致を防ぐ
 */

import { z } from 'zod'
import { FlowSession, ConceptOption, GeneratedContent, DraftItem } from '@/types/frontend'

// === バリデーションスキーマ ===

// Flow関連
export const CreateFlowRequestSchema = z.object({
  theme: z.string().min(1, 'テーマは必須です').max(200, 'テーマは200文字以内で入力してください')
})

export const NextFlowActionRequestSchema = z.object({
  selectedConcepts: z.array(z.any()).optional(),
  characterId: z.string().optional(),
  autoProgress: z.boolean().optional()
})

// Draft関連
export const CreateDraftRequestSchema = z.object({
  sessionId: z.string(),
  content: z.string(),
  hashtags: z.array(z.string()),
  characterId: z.string(),
  conceptId: z.string().optional()
})

export const UpdateDraftRequestSchema = z.object({
  content: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  scheduledAt: z.string().optional()
})

// === API Request/Response Types ===

// Flow API
export interface CreateFlowRequest {
  theme: string
}

export interface CreateFlowResponse {
  success: boolean
  data?: {
    id: string
    theme: string
    currentStep: string
    nextAction: string | null
  }
  error?: string
}

export interface GetFlowResponse {
  success: boolean
  data?: FlowSession
  error?: string
}

export interface NextFlowActionRequest {
  selectedConcepts?: ConceptOption[]
  characterId?: string
  autoProgress?: boolean
}

export interface NextFlowActionResponse {
  success: boolean
  data?: {
    currentStep: string
    nextAction: string | null
    progress: Record<string, boolean>
    updated: boolean
  }
  error?: string
}

// Draft API
export interface CreateDraftRequest {
  sessionId: string
  content: string
  hashtags: string[]
  characterId: string
  conceptId?: string
}

export interface CreateDraftResponse {
  success: boolean
  data?: DraftItem
  error?: string
}

export interface GetDraftsResponse {
  success: boolean
  data?: DraftItem[]
  error?: string
}

export interface UpdateDraftRequest {
  content?: string
  hashtags?: string[]
  scheduledAt?: string
}

export interface UpdateDraftResponse {
  success: boolean
  data?: DraftItem
  error?: string
}

// Post API
export interface PostDraftRequest {
  draftId: string
  immediate?: boolean
}

export interface PostDraftResponse {
  success: boolean
  data?: {
    twitterUrl: string
    postedAt: string
  }
  error?: string
}

// === API関数の型定義 ===

// フロントエンド側で使用するAPI関数の型
export interface FlowApiClient {
  createFlow: (request: CreateFlowRequest) => Promise<CreateFlowResponse>
  getFlow: (id: string) => Promise<GetFlowResponse>
  nextAction: (id: string, request: NextFlowActionRequest) => Promise<NextFlowActionResponse>
}

export interface DraftApiClient {
  createDraft: (request: CreateDraftRequest) => Promise<CreateDraftResponse>
  getDrafts: () => Promise<GetDraftsResponse>
  updateDraft: (id: string, request: UpdateDraftRequest) => Promise<UpdateDraftResponse>
  deleteDraft: (id: string) => Promise<{ success: boolean; error?: string }>
  postDraft: (request: PostDraftRequest) => Promise<PostDraftResponse>
}

// === DBマネージャー連携の型定義 ===

export interface DBManagerIntegration {
  // Session操作
  findSession: (id: string) => Promise<FlowSession | null>
  updateSession: (id: string, data: Partial<FlowSession>) => Promise<FlowSession>
  createSession: (data: CreateFlowRequest) => Promise<FlowSession>
  
  // Draft操作  
  findDrafts: (sessionId?: string) => Promise<DraftItem[]>
  createDraft: (data: CreateDraftRequest) => Promise<DraftItem>
  updateDraft: (id: string, data: Partial<DraftItem>) => Promise<DraftItem>
  deleteDraft: (id: string) => Promise<boolean>
  
  // バリデーション
  validateSessionExists: (id: string) => Promise<boolean>
  validateDraftOwnership: (draftId: string, sessionId: string) => Promise<boolean>
}

// === エラーハンドリング統一 ===

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const ApiErrorCodes = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors  
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  DRAFT_NOT_FOUND: 'DRAFT_NOT_FOUND',
  
  // State errors
  INVALID_FLOW_STATE: 'INVALID_FLOW_STATE',
  CONCEPT_SELECTION_REQUIRED: 'CONCEPT_SELECTION_REQUIRED',
  CHARACTER_SELECTION_REQUIRED: 'CHARACTER_SELECTION_REQUIRED',
  
  // External service errors
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TWITTER_API_ERROR: 'TWITTER_API_ERROR',
  
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const

export type ApiErrorCode = typeof ApiErrorCodes[keyof typeof ApiErrorCodes]

// === 統一レスポンス形式 ===

export interface StandardApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: ApiErrorCode
    message: string
    details?: any
  }
  timestamp: string
  requestId?: string
}

// === API契約の検証ヘルパー ===

export class ApiContractValidator {
  
  static validateCreateFlowRequest(data: unknown): CreateFlowRequest {
    const result = CreateFlowRequestSchema.safeParse(data)
    if (!result.success) {
      throw new ApiError(
        ApiErrorCodes.INVALID_INPUT,
        'Invalid flow creation request',
        400,
        result.error.errors
      )
    }
    return result.data
  }
  
  static validateNextFlowActionRequest(data: unknown): NextFlowActionRequest {
    const result = NextFlowActionRequestSchema.safeParse(data)
    if (!result.success) {
      throw new ApiError(
        ApiErrorCodes.INVALID_INPUT,
        'Invalid flow action request',
        400,
        result.error.errors
      )
    }
    return result.data
  }
  
  static validateCreateDraftRequest(data: unknown): CreateDraftRequest {
    const result = CreateDraftRequestSchema.safeParse(data)
    if (!result.success) {
      throw new ApiError(
        ApiErrorCodes.INVALID_INPUT,
        'Invalid draft creation request',
        400,
        result.error.errors
      )
    }
    return result.data
  }
  
  static validateUpdateDraftRequest(data: unknown): UpdateDraftRequest {
    const result = UpdateDraftRequestSchema.safeParse(data)
    if (!result.success) {
      throw new ApiError(
        ApiErrorCodes.INVALID_INPUT,
        'Invalid draft update request',
        400,
        result.error.errors
      )
    }
    return result.data
  }
}

// === 統一エラーレスポンス生成 ===

export function createErrorResponse(error: ApiError | Error): StandardApiResponse {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      timestamp: new Date().toISOString()
    }
  }
  
  return {
    success: false,
    error: {
      code: ApiErrorCodes.INTERNAL_ERROR,
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    timestamp: new Date().toISOString()
  }
}

export function createSuccessResponse<T>(data: T, requestId?: string): StandardApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId
  }
}