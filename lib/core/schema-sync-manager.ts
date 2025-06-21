/**
 * スキーマ同期マネージャー
 * Prismaスキーマ、DB、フロントエンドの型定義を統一管理
 * 
 * 失敗経験から学んだポイント：
 * 1. snake_case（DB） vs camelCase（JS/TS）の自動変換
 * 2. 単一の真実の情報源（Single Source of Truth）
 * 3. 実行時の型チェックとバリデーション
 * 4. 自動的な不整合検出
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ===========================================
// 1. モデル名のマッピング定義
// ===========================================

/**
 * Prismaモデル名とDBテーブル名のマッピング
 * PrismaはPascalCase、DBはsnake_case
 */
export const ModelNameMapping = {
  // メインモデル
  ViralSession: 'viral_sessions',
  ViralDraft: 'viral_drafts',
  ScheduledPost: 'scheduled_posts',
  SessionActivityLog: 'session_activity_logs',
  
  // 関連モデル
  BuzzPost: 'buzz_posts',
  NewsArticle: 'news_articles',
  CharacterProfile: 'character_profiles',
  
  // パフォーマンス
  ViralDraftPerformance: 'viral_draft_performance',
  UnifiedPerformance: 'unified_performance',
} as const

/**
 * Prismaクライアントのプロパティ名
 * Prismaは自動的にcamelCaseに変換する
 */
export const PrismaModelNames = {
  viral_sessions: 'viral_sessionss',
  viral_drafts: 'viralDrafts',
  scheduled_posts: 'scheduledPosts',
  session_activity_logs: 'sessionActivityLogs',
  buzz_posts: 'buzzPosts',
  news_articles: 'newsArticles',
  character_profiles: 'characterProfiles',
  viral_draft_performance: 'viralDraftPerformance',
  unified_performance: 'unifiedPerformance',
} as const

// ===========================================
// 2. フィールド名の統一定義
// ===========================================

/**
 * フィールド名のマッピング
 * DB（snake_case） → JS/TS（camelCase）
 */
export const FieldNameMapping = {
  // 共通フィールド
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  posted_at: 'postedAt',
  scheduled_at: 'scheduledAt',
  
  // セッション関連
  session_id: 'sessionId',
  selected_ids: 'selectedIds',
  character_profile_id: 'characterProfileId',
  voice_style_mode: 'voiceStyleMode',
  
  // ドラフト関連
  concept_id: 'conceptId',
  character_id: 'characterId',
  visual_note: 'visualNote',
  character_note: 'characterNote',
  source_url: 'sourceUrl',
  news_article_id: 'newsArticleId',
  edited_content: 'editedContent',
  is_edited: 'isEdited',
  edited_at: 'editedAt',
  source_tweets: 'sourceTweets',
  thread_structure: 'threadStructure',
  post_history: 'postHistory',
  tweet_id: 'tweetId',
  
  // 投稿関連
  scheduled_time: 'scheduledTime',
  post_type: 'postType',
  ref_post_id: 'refPostId',
  template_type: 'templateType',
  ai_generated: 'aiGenerated',
  ai_prompt: 'aiPrompt',
  post_result: 'postResult',
} as const

// ===========================================
// 3. 統一されたスキーマ定義
// ===========================================

/**
 * ViralDraftV2の統一スキーマ
 * これが唯一の真実の情報源となる
 */
export const ViralDraftV2Schema = z.object({
  id: z.string(),
  sessionId: z.string(),
  conceptId: z.string(),
  title: z.string(),
  content: z.string(),
  editedContent: z.string().optional().nullable(),
  isEdited: z.boolean().default(false),
  editedAt: z.date().optional().nullable(),
  hashtags: z.array(z.string()),
  visualNote: z.string().optional().nullable(),
  status: z.string().default('DRAFT'),
  scheduled_at: z.date().optional().nullable(),
  posted_at: z.date().optional().nullable(),
  tweetId: z.string().optional().nullable(),
  sourceTweets: z.any().optional().nullable(), // JSON
  threadStructure: z.any().optional().nullable(), // JSON
  postHistory: z.array(z.any()).default([]), // JSON array
  created_at: z.date(),
  updated_at: z.date(),
  characterId: z.string().optional().nullable(),
  characterNote: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  newsArticleId: z.string().optional().nullable(),
})

export type ViralDraftV2 = z.infer<typeof ViralDraftV2Schema>

/**
 * PostHistoryEntryの統一スキーマ
 */
export const PostHistoryEntrySchema = z.object({
  posted_at: z.date(),
  tweetId: z.string(),
  contentUsed: z.enum(['original', 'edited']),
  includesSource: z.boolean(),
  threadIds: z.array(z.string()).optional(),
  sourceId: z.string().optional(),
  scheduledPostId: z.string().optional(),
})

export type PostHistoryEntry = z.infer<typeof PostHistoryEntrySchema>

// ===========================================
// 4. 変換関数
// ===========================================

/**
 * DBのsnake_caseからJS/TSのcamelCaseに変換
 */
export function dbToJs<T extends Record<string, any>>(dbRecord: T): any {
  const converted: any = {}
  
  for (const [key, value] of Object.entries(dbRecord)) {
    const jsKey = (FieldNameMapping as any)[key] || key
    
    // 日付型の処理
    if (value instanceof Date) {
      converted[jsKey] = value
    }
    // JSONフィールドの処理
    else if (key === 'post_history' && Array.isArray(value)) {
      converted[jsKey] = value.map((item: any) => 
        typeof item === 'object' ? dbToJs(item) : item
      )
    }
    // その他のJSONフィールド
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      converted[jsKey] = dbToJs(value)
    }
    else {
      converted[jsKey] = value
    }
  }
  
  return converted
}

/**
 * JS/TSのcamelCaseからDBのsnake_caseに変換
 */
export function jsToDb<T extends Record<string, any>>(jsRecord: T): any {
  const converted: any = {}
  
  // 逆マッピングを作成
  const reverseMapping: Record<string, string> = {}
  for (const [dbKey, jsKey] of Object.entries(FieldNameMapping)) {
    reverseMapping[jsKey] = dbKey
  }
  
  for (const [key, value] of Object.entries(jsRecord)) {
    const dbKey = reverseMapping[key] || key
    
    // 日付型の処理
    if (value instanceof Date) {
      converted[dbKey] = value
    }
    // 配列の処理
    else if (Array.isArray(value)) {
      converted[dbKey] = value.map((item: any) => 
        typeof item === 'object' ? jsToDb(item) : item
      )
    }
    // オブジェクトの処理
    else if (typeof value === 'object' && value !== null) {
      converted[dbKey] = jsToDb(value)
    }
    else {
      converted[dbKey] = value
    }
  }
  
  return converted
}

// ===========================================
// 5. バリデーション関数
// ===========================================

/**
 * ドラフトデータのバリデーション
 */
export function validateDraft(data: unknown): ViralDraftV2 {
  return ViralDraftV2Schema.parse(data)
}

/**
 * 投稿履歴エントリのバリデーション
 */
export function validatePostHistoryEntry(data: unknown): PostHistoryEntry {
  return PostHistoryEntrySchema.parse(data)
}

// ===========================================
// 6. 型安全なDB操作ヘルパー
// ===========================================

/**
 * 型安全なドラフト取得
 */
export async function getDraft(id: string): Promise<ViralDraftV2 | null> {
  const dbRecord = await prisma.viral_drafts.findUnique({
    where: { id }
  })
  
  if (!dbRecord) return null
  
  const jsRecord = dbToJs(dbRecord)
  return validateDraft(jsRecord)
}

/**
 * 型安全なドラフト更新
 */
export async function updateDraft(
  id: string, 
  data: Partial<ViralDraftV2>
): Promise<ViralDraftV2> {
  const dbData = jsToDb(data)
  
  const updated = await prisma.viral_drafts.update({
    where: { id },
    data: dbData
  })
  
  const jsRecord = dbToJs(updated)
  return validateDraft(jsRecord)
}

// ===========================================
// 7. スキーマ同期チェッカー
// ===========================================

/**
 * スキーマの不整合を検出
 */
export async function checkSchemaSync(): Promise<{
  isSync: boolean
  issues: string[]
}> {
  const issues: string[] = []
  
  try {
    // 1. サンプルデータでテスト
    const sampleDraft = await prisma.viral_drafts.findFirst()
    if (sampleDraft) {
      const jsRecord = dbToJs(sampleDraft)
      try {
        validateDraft(jsRecord)
      } catch (error) {
        if (error instanceof z.ZodError) {
          issues.push(`Validation error: ${error.message}`)
        }
      }
    }
    
    // 2. フィールド名の確認
    // ここで実際のDBスキーマとの比較を行う
    
    return {
      isSync: issues.length === 0,
      issues
    }
    
  } catch (error) {
    issues.push(`Schema check error: ${error}`)
    return {
      isSync: false,
      issues
    }
  }
}

// ===========================================
// エクスポート
// ===========================================

export const SchemaSyncManager = {
  ModelNameMapping,
  PrismaModelNames,
  FieldNameMapping,
  ViralDraftV2Schema,
  PostHistoryEntrySchema,
  dbToJs,
  jsToDb,
  validateDraft,
  validatePostHistoryEntry,
  getDraft,
  updateDraft,
  checkSchemaSync,
}

export default SchemaSyncManager