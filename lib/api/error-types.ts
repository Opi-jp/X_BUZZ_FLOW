/**
 * 統合システム用エラー型定義
 * Phase 3: エラーハンドリング強化
 */

export interface APIError {
  error: string
  code: string
  details?: any
  timestamp: string
  requestId: string
  phase?: 'intel' | 'create' | 'publish' | 'analyze'
  module?: string
  retryable?: boolean
  userMessage?: string
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: APIError
  meta?: {
    requestId: string
    timestamp: string
    version: string
  }
}

// エラーコード定義
export const ErrorCodes = {
  // Intel Module
  INTEL_COLLECTION_FAILED: 'INTEL_001',
  INTEL_TOPIC_PARSING_ERROR: 'INTEL_002',
  INTEL_SOURCE_UNAVAILABLE: 'INTEL_003',
  
  // Create Module  
  CREATE_SESSION_FAILED: 'CREATE_001',
  CREATE_CONCEPT_GENERATION_FAILED: 'CREATE_002',
  CREATE_CONTENT_GENERATION_FAILED: 'CREATE_003',
  CREATE_DRAFT_CREATION_FAILED: 'CREATE_004',
  
  // Publish Module
  PUBLISH_POST_FAILED: 'PUBLISH_001',
  PUBLISH_SCHEDULE_FAILED: 'PUBLISH_002',
  PUBLISH_RATE_LIMITED: 'PUBLISH_003',
  
  // Analyze Module
  ANALYZE_METRICS_FAILED: 'ANALYZE_001',
  ANALYZE_REPORT_FAILED: 'ANALYZE_002',
  
  // System
  DATABASE_CONNECTION_ERROR: 'SYS_001',
  AUTHENTICATION_FAILED: 'SYS_002',
  VALIDATION_ERROR: 'SYS_003',
  INTERNAL_SERVER_ERROR: 'SYS_004'
} as const

// ユーザー向けエラーメッセージ
export const UserErrorMessages = {
  [ErrorCodes.INTEL_COLLECTION_FAILED]: "情報収集でエラーが発生しました。しばらく待ってから再試行してください。",
  [ErrorCodes.INTEL_TOPIC_PARSING_ERROR]: "トピックの解析に失敗しました。入力内容を確認してください。",
  [ErrorCodes.CREATE_SESSION_FAILED]: "セッションの作成に失敗しました。",
  [ErrorCodes.CREATE_CONCEPT_GENERATION_FAILED]: "コンセプト生成でエラーが発生しました。",
  [ErrorCodes.CREATE_CONTENT_GENERATION_FAILED]: "投稿生成でエラーが発生しました。",
  [ErrorCodes.CREATE_DRAFT_CREATION_FAILED]: "下書き作成でエラーが発生しました。",
  [ErrorCodes.PUBLISH_POST_FAILED]: "投稿でエラーが発生しました。",
  [ErrorCodes.PUBLISH_RATE_LIMITED]: "投稿制限に達しました。しばらく待ってから再試行してください。",
  [ErrorCodes.DATABASE_CONNECTION_ERROR]: "データベース接続エラーが発生しました。",
  [ErrorCodes.AUTHENTICATION_FAILED]: "認証に失敗しました。ログインし直してください。",
  [ErrorCodes.VALIDATION_ERROR]: "入力データに問題があります。",
  [ErrorCodes.INTERNAL_SERVER_ERROR]: "内部サーバーエラーが発生しました。"
} as const

export type ErrorCode = keyof typeof ErrorCodes