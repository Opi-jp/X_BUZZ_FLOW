/**
 * 統一システム管理 (Unified System Manager)
 * 
 * 統合システム全体で使用される共通機能の管理
 * - ID生成
 * - 型定義とバリデーション
 * - プロンプト管理
 * - データ変換
 * - エラーハンドリング
 * - DB連携
 */

import { nanoid } from 'nanoid'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { loadPrompt, PromptVariables } from '@/lib/prompt-loader'

// ===========================================
// 1. ID生成管理
// ===========================================

export class IDGenerator {
  /**
   * エンティティタイプ別のID生成
   * プレフィックスで識別可能にする
   */
  static generate(entityType: EntityType): string {
    const prefix = ID_PREFIXES[entityType]
    return `${prefix}_${nanoid(12)}`
  }

  /**
   * IDのバリデーション
   */
  static validate(id: string, entityType?: EntityType): boolean {
    if (!id || typeof id !== 'string') return false
    
    // 基本的なバリデーション
    if (id === 'undefined' || id === 'null' || id.length < 3) return false
    
    // エンティティタイプが指定されている場合はプレフィックスもチェック
    if (entityType) {
      const prefix = ID_PREFIXES[entityType]
      return id.startsWith(`${prefix}_`)
    }
    
    return true
  }

  /**
   * IDからエンティティタイプを推定
   */
  static inferType(id: string): EntityType | null {
    for (const [type, prefix] of Object.entries(ID_PREFIXES)) {
      if (id.startsWith(`${prefix}_`)) {
        return type as EntityType
      }
    }
    return null
  }
}

// エンティティタイプ定義
export enum EntityType {
  // Intel Module
  NEWS_ARTICLE = 'NEWS_ARTICLE',
  BUZZ_POST = 'BUZZ_POST',
  TREND_INSIGHT = 'TREND_INSIGHT',
  
  // Create Module
  VIRAL_SESSION = 'VIRAL_SESSION',
  DRAFT = 'DRAFT',
  CONCEPT = 'CONCEPT',
  
  // Publish Module
  SCHEDULED_POST = 'SCHEDULED_POST',
  PUBLISHED_POST = 'PUBLISHED_POST',
  
  // Analyze Module
  PERFORMANCE_METRIC = 'PERFORMANCE_METRIC',
  REPORT = 'REPORT',
  
  // System
  JOB = 'JOB',
  ERROR_LOG = 'ERROR_LOG',
  ACTIVITY_LOG = 'ACTIVITY_LOG'
}

// IDプレフィックス定義
const ID_PREFIXES: Record<EntityType, string> = {
  [EntityType.NEWS_ARTICLE]: 'news',
  [EntityType.BUZZ_POST]: 'buzz',
  [EntityType.TREND_INSIGHT]: 'trend',
  [EntityType.VIRAL_SESSION]: 'sess',
  [EntityType.DRAFT]: 'draft',
  [EntityType.CONCEPT]: 'conc',
  [EntityType.SCHEDULED_POST]: 'sched',
  [EntityType.PUBLISHED_POST]: 'post',
  [EntityType.PERFORMANCE_METRIC]: 'perf',
  [EntityType.REPORT]: 'rept',
  [EntityType.JOB]: 'job',
  [EntityType.ERROR_LOG]: 'err',
  [EntityType.ACTIVITY_LOG]: 'act'
}

// ===========================================
// 2. 型定義とバリデーション管理
// ===========================================

/**
 * 共通のZodスキーマ定義
 */
export const CommonSchemas = {
  // ID関連
  id: z.string().min(3).refine(val => IDGenerator.validate(val), {
    message: "Invalid ID format"
  }),
  
  sessionId: z.string().refine(val => IDGenerator.validate(val, EntityType.VIRAL_SESSION), {
    message: "Invalid session ID"
  }),
  
  // 日時関連
  timestamp: z.string().datetime(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  
  // ページネーション
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    orderBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc')
  }),
  
  // ステータス
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
  
  // プラットフォーム
  platform: z.enum(['twitter', 'threads', 'bluesky']).default('twitter'),
  
  // スタイル
  style: z.enum(['エンターテイメント', 'ビジネス', '教育', 'ニュース']).default('エンターテイメント')
}

/**
 * モジュール別スキーマ定義
 */
export const ModuleSchemas = {
  // Intel Module
  newsArticle: z.object({
    id: CommonSchemas.id,
    title: z.string().max(200),
    url: z.string().url(),
    summary: z.string().max(500),
    importance: z.number().min(0).max(100),
    publishedAt: CommonSchemas.timestamp,
    analyzedAt: CommonSchemas.timestamp.optional()
  }),
  
  // Create Module
  viralSession: z.object({
    id: CommonSchemas.sessionId,
    theme: z.string().min(1).max(100),
    platform: CommonSchemas.platform,
    style: CommonSchemas.style,
    status: z.enum([
      'CREATED',
      'COLLECTING',
      'TOPICS_COLLECTED',
      'GENERATING_CONCEPTS',
      'CONCEPTS_GENERATED',
      'GENERATING_CONTENT',
      'CONTENTS_GENERATED',
      'COMPLETED',
      'ERROR'
    ]),
    createdAt: CommonSchemas.timestamp
  }),
  
  // API Request/Response
  apiRequest: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    endpoint: z.string(),
    params: z.record(z.any()).optional(),
    body: z.any().optional(),
    headers: z.record(z.string()).optional()
  }),
  
  apiResponse: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional()
    }).optional(),
    meta: z.object({
      requestId: z.string(),
      timestamp: z.string(),
      version: z.string()
    }).optional()
  })
}

// ===========================================
// 3. プロンプト管理
// ===========================================

export class PromptManager {
  private static cache = new Map<string, string>()
  
  /**
   * プロンプトを読み込み、変数を展開
   */
  static async load(
    promptPath: string,
    variables: PromptVariables,
    options?: {
      validate?: boolean
      cache?: boolean
    }
  ): Promise<string> {
    const cacheKey = `${promptPath}:${JSON.stringify(variables)}`
    
    // キャッシュチェック
    if (options?.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    try {
      // プロンプトをロード
      const prompt = loadPrompt(promptPath, variables)
      
      // バリデーション（必要な場合）
      if (options?.validate) {
        this.validatePrompt(prompt, promptPath)
      }
      
      // キャッシュに保存
      if (options?.cache) {
        this.cache.set(cacheKey, prompt)
      }
      
      return prompt
    } catch (error) {
      throw new PromptError(`Failed to load prompt: ${promptPath}`, error)
    }
  }
  
  /**
   * プロンプトのバリデーション
   */
  private static validatePrompt(prompt: string, path: string): void {
    // 未展開の変数がないかチェック
    const unexpandedVars = prompt.match(/\$\{[^}]+\}/g)
    if (unexpandedVars) {
      throw new PromptError(
        `Unexpanded variables found in ${path}: ${unexpandedVars.join(', ')}`
      )
    }
    
    // プロンプトの長さチェック
    if (prompt.length > 100000) {
      console.warn(`Prompt ${path} is very long: ${prompt.length} characters`)
    }
  }
  
  /**
   * キャラクタープロファイルを自然文に変換
   */
  static async wrapCharacterProfile(characterId: string): Promise<string> {
    const character = await getCharacter(characterId)
    if (!character) {
      return 'ニュートラルで親しみやすいトーンで投稿を作成します。'
    }
    
    let profile = `あなたは「${character.name}」として投稿を作成します。\n\n`
    
    if (character.age) profile += `${character.name}（${character.age}歳）\n`
    if (character.background) profile += `- 経歴: ${character.background}\n`
    if (character.philosophy) profile += `- 哲学: 「${character.philosophy}」\n`
    if (character.personality) profile += `- 性格: ${character.personality}\n`
    if (character.tone) profile += `- 口調: ${character.tone}\n`
    if (character.traits) profile += `- 特徴: ${character.traits}`
    
    return profile
  }
}

// ===========================================
// 4. データ変換管理
// ===========================================

export class DataTransformer {
  /**
   * DB層 → プロセス層への変換
   */
  static toProcessData<T extends Record<string, any>>(
    rawData: T,
    entityType: EntityType
  ): ProcessData {
    const baseData = {
      id: rawData.id,
      entityType,
      createdAt: rawData.createdAt || rawData.created_at,
      updatedAt: rawData.updatedAt || rawData.updated_at
    }
    
    // エンティティタイプ別の変換ロジック
    switch (entityType) {
      case EntityType.VIRAL_SESSION:
        return {
          ...baseData,
          theme: rawData.theme,
          status: rawData.status,
          progress: this.calculateProgress(rawData.status),
          metadata: {
            platform: rawData.platform,
            style: rawData.style,
            characterId: rawData.characterProfileId
          }
        }
        
      case EntityType.DRAFT:
        return {
          ...baseData,
          title: rawData.title,
          content: rawData.content,
          status: rawData.status,
          metadata: {
            characterCount: rawData.content?.length || 0,
            hashtags: rawData.hashtags,
            sessionId: rawData.sessionId
          }
        }
        
      default:
        return {
          ...baseData,
          ...rawData
        }
    }
  }
  
  /**
   * プロセス層 → 表示層への変換
   */
  static toDisplayData(
    processData: ProcessData,
    level: 'summary' | 'preview' | 'detail' = 'summary'
  ): DisplayData {
    const displayData: DisplayData = {
      id: processData.id,
      entityType: processData.entityType,
      createdAt: processData.createdAt
    }
    
    // レベル別の情報量調整
    switch (level) {
      case 'summary':
        // 最小限の情報のみ
        displayData.title = processData.title || 'Untitled'
        displayData.status = processData.status
        displayData.score = processData.score
        break
        
      case 'preview':
        // プレビュー用の追加情報
        Object.assign(displayData, {
          title: processData.title,
          summary: this.truncate(processData.content || '', 200),
          status: processData.status,
          metadata: this.filterMetadata(processData.metadata, ['important'])
        })
        break
        
      case 'detail':
        // 完全な情報
        Object.assign(displayData, processData)
        break
    }
    
    return displayData
  }
  
  /**
   * テキストの切り詰め
   */
  private static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }
  
  /**
   * メタデータのフィルタリング
   */
  private static filterMetadata(
    metadata: Record<string, any> | undefined,
    keys: string[]
  ): Record<string, any> {
    if (!metadata) return {}
    
    const filtered: Record<string, any> = {}
    for (const key of keys) {
      if (key in metadata) {
        filtered[key] = metadata[key]
      }
    }
    return filtered
  }
  
  /**
   * 進捗率の計算
   */
  private static calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'CREATED': 0,
      'COLLECTING': 10,
      'TOPICS_COLLECTED': 30,
      'GENERATING_CONCEPTS': 50,
      'CONCEPTS_GENERATED': 70,
      'GENERATING_CONTENT': 85,
      'CONTENTS_GENERATED': 95,
      'COMPLETED': 100,
      'ERROR': -1
    }
    
    return progressMap[status] ?? 0
  }
}

// ===========================================
// 5. エラーハンドリング管理
// ===========================================

export class ErrorManager {
  /**
   * エラーの記録
   */
  static async logError(
    error: Error | unknown,
    context: {
      module: string
      operation: string
      userId?: string
      sessionId?: string
      metadata?: Record<string, any>
    }
  ): Promise<string> {
    const errorLog = {
      id: IDGenerator.generate(EntityType.ERROR_LOG),
      timestamp: new Date().toISOString(),
      module: context.module,
      operation: context.operation,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: context.metadata
    }
    
    // DBに記録
    try {
      await prisma.api_error_logs.create({
        data: {
          id: errorLog.id,
          endpoint: `${context.module}/${context.operation}`,
          method: 'ERROR',
          statusCode: 500,
          errorMessage: errorLog.message,
          stackTrace: errorLog.stack,
          requestBody: errorLog.metadata,
          userId: errorLog.userId
        }
      })
    } catch (dbError) {
      console.error('Failed to log error to DB:', dbError)
    }
    
    // 開発環境ではコンソールにも出力
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorManager]', errorLog)
    }
    
    // ファイルにも記録
    try {
      const fs = require('fs').promises
      const path = require('path')
      const errorDir = path.join(process.cwd(), 'logs', 'errors')
      await fs.mkdir(errorDir, { recursive: true })
      const errorFile = path.join(errorDir, `${errorLog.id}.json`)
      await fs.writeFile(errorFile, JSON.stringify(errorLog, null, 2))
    } catch (fileError) {
      console.error('Failed to write error log to file:', fileError)
    }
    
    return errorLog.id
  }
  
  /**
   * ユーザー向けエラーメッセージの生成
   */
  static getUserMessage(error: Error | unknown, locale: 'ja' | 'en' = 'ja'): string {
    // エラーコードからメッセージを取得
    if (error instanceof SystemError && error.code) {
      return ERROR_MESSAGES[locale][error.code] || ERROR_MESSAGES[locale].UNKNOWN
    }
    
    // デフォルトメッセージ
    return ERROR_MESSAGES[locale].UNKNOWN
  }
  
  /**
   * リトライ可能かどうかの判定
   */
  static isRetryable(error: Error | unknown): boolean {
    if (error instanceof SystemError) {
      return error.retryable ?? false
    }
    
    // ネットワークエラーやタイムアウトはリトライ可能
    const message = error instanceof Error ? error.message : String(error)
    return /timeout|network|fetch/i.test(message)
  }
}

// カスタムエラークラス
export class SystemError extends Error {
  constructor(
    message: string,
    public code?: string,
    public retryable?: boolean,
    public details?: any
  ) {
    super(message)
    this.name = 'SystemError'
  }
}

export class PromptError extends SystemError {
  constructor(message: string, cause?: any) {
    super(message, 'PROMPT_ERROR', false, { cause })
    this.name = 'PromptError'
  }
}

// エラーメッセージ定義
const ERROR_MESSAGES = {
  ja: {
    UNKNOWN: 'エラーが発生しました。しばらく待ってから再試行してください。',
    NETWORK_ERROR: 'ネットワークエラーが発生しました。',
    TIMEOUT_ERROR: 'タイムアウトしました。',
    VALIDATION_ERROR: '入力内容に問題があります。',
    AUTH_ERROR: '認証に失敗しました。',
    PERMISSION_ERROR: '権限がありません。',
    NOT_FOUND: 'リソースが見つかりません。',
    PROMPT_ERROR: 'プロンプトの処理でエラーが発生しました。'
  },
  en: {
    UNKNOWN: 'An error occurred. Please try again later.',
    NETWORK_ERROR: 'Network error occurred.',
    TIMEOUT_ERROR: 'Request timed out.',
    VALIDATION_ERROR: 'Invalid input.',
    AUTH_ERROR: 'Authentication failed.',
    PERMISSION_ERROR: 'Permission denied.',
    NOT_FOUND: 'Resource not found.',
    PROMPT_ERROR: 'Prompt processing error.'
  }
}

// ===========================================
// 6. DB連携管理
// ===========================================

export class DBManager {
  /**
   * トランザクション実行ラッパー
   */
  static async transaction<T>(
    callback: (tx: typeof prisma) => Promise<T>,
    options?: {
      maxRetries?: number
      timeout?: number
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3
    const timeout = options?.timeout ?? 30000
    
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await prisma.$transaction(callback, {
          timeout,
          isolationLevel: 'Serializable'
        })
      } catch (error) {
        lastError = error as Error
        
        // リトライ不可能なエラーの場合は即座に失敗
        if (!this.isRetryableDBError(error)) {
          throw error
        }
        
        // 指数バックオフで待機
        if (i < maxRetries - 1) {
          await this.sleep(Math.pow(2, i) * 1000)
        }
      }
    }
    
    throw lastError
  }
  
  /**
   * バッチ処理の実行
   */
  static async batchOperation<T>(
    items: T[],
    operation: (batch: T[]) => Promise<void>,
    batchSize: number = 100
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      await operation(batch)
      
      // DBへの負荷を軽減するため少し待機
      if (i + batchSize < items.length) {
        await this.sleep(100)
      }
    }
  }
  
  /**
   * DBエラーがリトライ可能かどうかの判定
   */
  private static isRetryableDBError(error: any): boolean {
    const message = error?.message || ''
    return (
      message.includes('deadlock') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('P2024') // Prismaのタイムアウトエラー
    )
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ===========================================
// 型定義
// ===========================================

export interface ProcessData {
  id: string
  entityType: EntityType
  title?: string
  content?: string
  status?: string
  score?: number
  progress?: number
  createdAt?: string
  updatedAt?: string
  metadata?: Record<string, any>
}

export interface DisplayData {
  id: string
  entityType: EntityType
  title?: string
  summary?: string
  status?: string
  score?: number
  createdAt?: string
  [key: string]: any
}

// キャラクター関連の型定義（character-loaderから）
interface Character {
  id: string
  name: string
  description: string
  age?: number
  background?: string
  philosophy?: string
  personality?: string
  tone?: string
  traits?: string
}

// キャラクター取得関数（実際の実装はcharacter-loaderから）
async function getCharacter(characterId: string): Promise<Character | null> {
  // TODO: character-loaderからインポート
  return null
}

// ===========================================
// エクスポート
// ===========================================

const UnifiedSystemManager = {
  IDGenerator,
  EntityType,
  CommonSchemas,
  ModuleSchemas,
  PromptManager,
  DataTransformer,
  ErrorManager,
  DBManager,
  SystemError,
  PromptError
}

export default UnifiedSystemManager