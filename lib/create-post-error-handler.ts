/**
 * Create→Post フロー専用エラーハンドラー
 * 統一システム管理を活用した包括的なエラーハンドリング
 */

import { 
  ErrorManager, 
  SystemError, 
  IDGenerator, 
  EntityType 
} from '@/lib/core/unified-system-manager'
import { prisma } from '@/lib/prisma'

// フェーズ定義
export enum CreatePostPhase {
  PERPLEXITY = 'perplexity',
  GPT = 'gpt',
  CLAUDE = 'claude',
  DRAFT = 'draft',
  POST = 'post'
}

// エラータイプ定義
export enum CreatePostErrorType {
  // API関連
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_INVALID_RESPONSE = 'API_INVALID_RESPONSE',
  API_CONNECTION_FAILED = 'API_CONNECTION_FAILED',
  
  // データ変換関連
  DATA_PARSE_ERROR = 'DATA_PARSE_ERROR',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  DATA_MISSING_REQUIRED = 'DATA_MISSING_REQUIRED',
  
  // DB関連
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  
  // ビジネスロジック関連
  INVALID_SESSION_STATE = 'INVALID_SESSION_STATE',
  CONCEPT_SELECTION_FAILED = 'CONCEPT_SELECTION_FAILED',
  CHARACTER_NOT_FOUND = 'CHARACTER_NOT_FOUND'
}

// エラーレスポンス型
export interface CreatePostErrorResponse {
  error: string
  code: CreatePostErrorType
  phase: CreatePostPhase
  details?: any
  timestamp: string
  requestId: string
  retryable: boolean
  userMessage: string
}

/**
 * Create→Post専用エラークラス
 */
export class CreatePostError extends SystemError {
  constructor(
    message: string,
    public phase: CreatePostPhase,
    public errorType: CreatePostErrorType,
    public sessionId?: string,
    retryable = false,
    details?: any
  ) {
    super(message, errorType, retryable, details)
    this.name = 'CreatePostError'
  }
}

/**
 * エラーハンドリングユーティリティ
 */
export class CreatePostErrorHandler {
  /**
   * エラーを処理して標準化されたレスポンスを生成
   */
  static async handle(
    error: Error | unknown,
    phase: CreatePostPhase,
    sessionId?: string,
    userId?: string
  ): Promise<CreatePostErrorResponse> {
    const requestId = IDGenerator.generate(EntityType.ERROR_LOG)
    
    // エラーの分類
    const { errorType, retryable, userMessage } = this.classifyError(error, phase)
    
    // エラーログの記録
    await ErrorManager.logError(error, {
      module: 'create-post',
      operation: phase,
      userId,
      sessionId,
      metadata: {
        errorType,
        phase,
        originalError: error instanceof Error ? error.message : String(error)
      }
    })
    
    // セッションのステータスをERRORに更新
    if (sessionId) {
      await this.updateSessionError(sessionId, phase, errorType)
    }
    
    return {
      error: error instanceof Error ? error.message : String(error),
      code: errorType,
      phase,
      details: error instanceof CreatePostError ? error.details : undefined,
      timestamp: new Date().toISOString(),
      requestId,
      retryable,
      userMessage
    }
  }
  
  /**
   * エラーの分類とメタデータ生成
   */
  private static classifyError(
    error: Error | unknown,
    phase: CreatePostPhase
  ): {
    errorType: CreatePostErrorType
    retryable: boolean
    userMessage: string
  } {
    // 既にCreatePostErrorの場合
    if (error instanceof CreatePostError) {
      return {
        errorType: error.errorType,
        retryable: error.retryable || false,
        userMessage: this.getUserMessage(error.errorType, phase)
      }
    }
    
    const message = error instanceof Error ? error.message : String(error)
    
    // タイムアウトエラー
    if (/timeout|timed out/i.test(message)) {
      return {
        errorType: CreatePostErrorType.API_TIMEOUT,
        retryable: true,
        userMessage: this.getUserMessage(CreatePostErrorType.API_TIMEOUT, phase)
      }
    }
    
    // レート制限エラー
    if (/rate limit|too many requests|429/i.test(message)) {
      return {
        errorType: CreatePostErrorType.API_RATE_LIMIT,
        retryable: true,
        userMessage: this.getUserMessage(CreatePostErrorType.API_RATE_LIMIT, phase)
      }
    }
    
    // JSONパースエラー
    if (/json|parse|unexpected token|invalid/i.test(message)) {
      return {
        errorType: CreatePostErrorType.DATA_PARSE_ERROR,
        retryable: phase === CreatePostPhase.PERPLEXITY, // Perplexityのみリトライ可能
        userMessage: this.getUserMessage(CreatePostErrorType.DATA_PARSE_ERROR, phase)
      }
    }
    
    // DB接続エラー
    if (/database|prisma|connection|P\d{4}/i.test(message)) {
      return {
        errorType: CreatePostErrorType.DB_CONNECTION_ERROR,
        retryable: true,
        userMessage: this.getUserMessage(CreatePostErrorType.DB_CONNECTION_ERROR, phase)
      }
    }
    
    // デフォルト
    return {
      errorType: CreatePostErrorType.API_INVALID_RESPONSE,
      retryable: false,
      userMessage: this.getUserMessage(CreatePostErrorType.API_INVALID_RESPONSE, phase)
    }
  }
  
  /**
   * ユーザー向けメッセージの生成
   */
  private static getUserMessage(
    errorType: CreatePostErrorType,
    phase: CreatePostPhase
  ): string {
    const phaseMessages: Record<CreatePostPhase, string> = {
      [CreatePostPhase.PERPLEXITY]: '情報収集',
      [CreatePostPhase.GPT]: 'コンセプト生成',
      [CreatePostPhase.CLAUDE]: '投稿文生成',
      [CreatePostPhase.DRAFT]: '下書き作成',
      [CreatePostPhase.POST]: '投稿'
    }
    
    const errorMessages: Record<CreatePostErrorType, string> = {
      [CreatePostErrorType.API_TIMEOUT]: 'がタイムアウトしました。もう一度お試しください。',
      [CreatePostErrorType.API_RATE_LIMIT]: 'のAPI制限に達しました。しばらく待ってから再試行してください。',
      [CreatePostErrorType.API_INVALID_RESPONSE]: 'で予期しないエラーが発生しました。',
      [CreatePostErrorType.API_CONNECTION_FAILED]: 'への接続に失敗しました。',
      [CreatePostErrorType.DATA_PARSE_ERROR]: 'のデータ処理でエラーが発生しました。',
      [CreatePostErrorType.DATA_VALIDATION_ERROR]: 'のデータ検証でエラーが発生しました。',
      [CreatePostErrorType.DATA_MISSING_REQUIRED]: 'に必要なデータが不足しています。',
      [CreatePostErrorType.DB_CONNECTION_ERROR]: 'データベース接続エラーが発生しました。',
      [CreatePostErrorType.DB_TRANSACTION_FAILED]: 'データの保存に失敗しました。',
      [CreatePostErrorType.DB_CONSTRAINT_VIOLATION]: 'データの整合性エラーが発生しました。',
      [CreatePostErrorType.INVALID_SESSION_STATE]: 'セッションの状態が無効です。',
      [CreatePostErrorType.CONCEPT_SELECTION_FAILED]: 'コンセプトの選択に失敗しました。',
      [CreatePostErrorType.CHARACTER_NOT_FOUND]: 'キャラクターが見つかりません。'
    }
    
    const phaseMessage = phaseMessages[phase]
    const errorMessage = errorMessages[errorType]
    
    return `${phaseMessage}${errorMessage}`
  }
  
  /**
   * セッションのエラー情報を更新
   */
  private static async updateSessionError(
    sessionId: string,
    phase: CreatePostPhase,
    errorType: CreatePostErrorType
  ): Promise<void> {
    try {
      await prisma.viralSession.update({
        where: { id: sessionId },
        data: {
          status: 'ERROR',
          errorDetails: {
            phase,
            errorType,
            timestamp: new Date().toISOString()
          }
        }
      })
    } catch (error) {
      console.error('Failed to update session error status:', error)
    }
  }
}

/**
 * リトライ機能付きエラーハンドラー
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  phase: CreatePostPhase,
  options: {
    maxRetries?: number
    retryDelay?: number
    sessionId?: string
    userId?: string
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3
  const retryDelay = options.retryDelay ?? 1000
  
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // エラーを分類
      const errorResponse = await CreatePostErrorHandler.handle(
        error,
        phase,
        options.sessionId,
        options.userId
      )
      
      // リトライ不可能な場合は即座に失敗
      if (!errorResponse.retryable) {
        throw new CreatePostError(
          errorResponse.error,
          phase,
          errorResponse.code,
          options.sessionId,
          false,
          errorResponse.details
        )
      }
      
      // 最後の試行でなければ待機してリトライ
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, i)))
      }
    }
  }
  
  // 全てのリトライが失敗した場合
  throw new CreatePostError(
    `Failed after ${maxRetries} retries: ${lastError?.message}`,
    phase,
    CreatePostErrorType.API_TIMEOUT,
    options.sessionId,
    false
  )
}