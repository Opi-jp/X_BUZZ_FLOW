/**
 * 統一システム管理 クイックリファレンス
 * 
 * よく使うパターンをすぐにコピー＆ペーストできるように
 */

// ============================================
// 1. 基本的なインポート
// ============================================

// 標準的なインポート
import { 
  IDGenerator, 
  EntityType,
  ErrorManager,
  PromptManager,
  CommonSchemas,
  ModuleSchemas,
  DataTransformer,
  DBManager
} from '@/lib/core/unified-system-manager'
import { NextResponse } from 'next/server'

// フルインポート（全機能使用時）
import USM from '@/lib/core/unified-system-manager'

// ============================================
// 2. ID生成パターン
// ============================================

// 各種エンティティのID生成
const newsId = IDGenerator.generate(EntityType.NEWS_ARTICLE)         // news_xxxxxxxxxxxx
const buzzId = IDGenerator.generate(EntityType.BUZZ_POST)           // buzz_xxxxxxxxxxxx
const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)    // sess_xxxxxxxxxxxx
const draftId = IDGenerator.generate(EntityType.DRAFT)              // draft_xxxxxxxxxxxx
const jobId = IDGenerator.generate(EntityType.JOB)                  // job_xxxxxxxxxxxx

// ============================================
// 3. バリデーションパターン
// ============================================

// 基本的なバリデーション
import { z } from 'zod'

// セッション作成
const createSessionSchema = z.object({
  theme: z.string().min(1).max(100),
  platform: CommonSchemas.platform,
  style: CommonSchemas.style
})

// ページネーション付きリクエスト
const listRequestSchema = z.object({
  ...CommonSchemas.pagination.shape,
  filter: z.object({
    status: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).optional()
})

// ============================================
// 4. APIレスポンスパターン
// ============================================

// 成功レスポンス
export function successResponse<T>(data: T, meta?: any) {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      requestId: IDGenerator.generate(EntityType.JOB),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      ...meta
    }
  })
}

// エラーレスポンス
export async function errorResponse(
  error: Error | unknown,
  module: string,
  operation: string,
  status: number = 500
) {
  const errorId = await ErrorManager.logError(error, { module, operation })
  const userMessage = ErrorManager.getUserMessage(error, 'ja')
  
  return NextResponse.json({
    success: false,
    error: {
      code: `${module.toUpperCase()}_${operation.toUpperCase()}_ERROR`,
      message: userMessage,
      errorId,
      retryable: ErrorManager.isRetryable(error)
    }
  }, { status })
}

// ============================================
// 5. データ変換パターン
// ============================================

// 一覧表示用の変換
export function toListDisplayData<T extends { id: string }>(
  items: T[],
  entityType: EntityType
): any[] {
  return items.map(item => {
    const processData = DataTransformer.toProcessData(item, entityType)
    return DataTransformer.toDisplayData(processData, 'summary')
  })
}

// 詳細表示用の変換
export function toDetailDisplayData<T extends { id: string }>(
  item: T,
  entityType: EntityType
): any {
  const processData = DataTransformer.toProcessData(item, entityType)
  return DataTransformer.toDisplayData(processData, 'detail')
}

// ============================================
// 6. DB操作パターン
// ============================================

// 作成パターン
export async function createWithLog<T>(
  entityType: EntityType,
  createFn: (id: string) => Promise<T>,
  logDetails?: any
): Promise<T> {
  const id = IDGenerator.generate(entityType)
  
  return DBManager.transaction(async (tx) => {
    const entity = await createFn(id)
    
    await tx.session_activity_logs.create({
      data: {
        id: IDGenerator.generate(EntityType.ACTIVITY_LOG),
        session_id: id,
        session_type: entityType,
        activity_type: 'CREATED',
        details: logDetails
      }
    })
    
    return entity
  })
}

// 更新パターン
export async function updateWithLog<T>(
  id: string,
  entityType: EntityType,
  updateFn: () => Promise<T>,
  logDetails?: any
): Promise<T> {
  return DBManager.transaction(async (tx) => {
    const entity = await updateFn()
    
    await tx.session_activity_logs.create({
      data: {
        id: IDGenerator.generate(EntityType.ACTIVITY_LOG),
        session_id: id,
        session_type: entityType,
        activity_type: 'UPDATED',
        details: logDetails
      }
    })
    
    return entity
  })
}

// ============================================
// 7. エラーハンドリングパターン
// ============================================

// 標準的なtry-catchパターン
export async function safeExecute<T>(
  fn: () => Promise<T>,
  module: string,
  operation: string
): Promise<{ data?: T; error?: any }> {
  try {
    const data = await fn()
    return { data }
  } catch (error) {
    await ErrorManager.logError(error, { module, operation })
    return { error }
  }
}

// リトライ付き実行
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (!ErrorManager.isRetryable(error)) {
        throw error
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }
  
  throw lastError
}

// ============================================
// 8. プロンプト管理パターン
// ============================================

// プロンプト読み込みヘルパー
export async function loadPromptSafe(
  path: string,
  variables: Record<string, any>
): Promise<string | null> {
  try {
    return await PromptManager.load(path, variables, {
      validate: true,
      cache: true
    })
  } catch (error) {
    await ErrorManager.logError(error, {
      module: 'prompt',
      operation: 'load',
      metadata: { path, variables }
    })
    return null
  }
}

// ============================================
// 9. 完全なAPIハンドラーテンプレート
// ============================================

export async function apiHandlerTemplate(
  request: Request,
  config: {
    module: string
    operation: string
    schema: z.ZodSchema
    handler: (data: any) => Promise<any>
  }
) {
  const { module, operation, schema, handler } = config
  
  try {
    // リクエストボディの取得
    const body = await request.json().catch(() => ({}))
    
    // バリデーション
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力データが正しくありません',
          details: parsed.error.errors
        }
      }, { status: 400 })
    }
    
    // ハンドラー実行
    const result = await handler(parsed.data)
    
    // 成功レスポンス
    return successResponse(result)
    
  } catch (error) {
    // エラーレスポンス
    return errorResponse(error, module, operation)
  }
}

// ============================================
// 使用例
// ============================================

/*
// app/api/intel/news/analyze/route.ts
export const POST = (request: Request) => apiHandlerTemplate(request, {
  module: 'intel',
  operation: 'analyze-news',
  schema: z.object({
    articleId: CommonSchemas.id,
    depth: z.enum(['quick', 'normal', 'deep']).default('normal')
  }),
  handler: async ({ articleId, depth }) => {
    // ビジネスロジック
    const article = await prisma.newsArticle.findUnique({
      where: { id: articleId }
    })
    
    if (!article) {
      throw new SystemError('Article not found', 'NOT_FOUND')
    }
    
    // 分析実行...
    const analysis = await analyzeArticle(article, depth)
    
    // データ変換して返却
    return toDetailDisplayData(analysis, EntityType.NEWS_ARTICLE)
  }
})
*/