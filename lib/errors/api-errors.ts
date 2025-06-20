/**
 * API統一エラーハンドリング
 * Create→Draft→Postフロー全体で使用する標準エラー形式
 */

export interface APIError {
  error: string
  code: string
  details?: any
  timestamp: string
  requestId: string
  phase?: 'perplexity' | 'gpt' | 'claude' | 'draft' | 'post'
}

export enum ErrorCodes {
  // Perplexity関連
  PERPLEXITY_API_KEY_MISSING = 'PERPLEXITY_001',
  PERPLEXITY_API_ERROR = 'PERPLEXITY_002',
  PERPLEXITY_TIMEOUT = 'PERPLEXITY_003',
  PERPLEXITY_INVALID_RESPONSE = 'PERPLEXITY_004',
  
  // GPT関連
  GPT_API_KEY_MISSING = 'GPT_001',
  GPT_API_ERROR = 'GPT_002',
  GPT_INVALID_TOPICS = 'GPT_003',
  GPT_GENERATION_FAILED = 'GPT_004',
  
  // Claude関連
  CLAUDE_API_KEY_MISSING = 'CLAUDE_001',
  CLAUDE_API_ERROR = 'CLAUDE_002',
  CLAUDE_NO_CONCEPTS = 'CLAUDE_003',
  CLAUDE_GENERATION_FAILED = 'CLAUDE_004',
  
  // セッション関連
  SESSION_NOT_FOUND = 'SESSION_001',
  SESSION_INVALID_STATE = 'SESSION_002',
  SESSION_ALREADY_COMPLETED = 'SESSION_003',
  
  // データベース関連
  DB_CONNECTION_ERROR = 'DB_001',
  DB_TRANSACTION_FAILED = 'DB_002',
  
  // Twitter投稿関連
  TWITTER_AUTH_MISSING = 'TWITTER_001',
  TWITTER_POST_FAILED = 'TWITTER_002',
  TWITTER_RATE_LIMIT = 'TWITTER_003'
}

export class APIErrorResponse extends Error {
  public code: string
  public details?: any
  public phase?: string
  public requestId: string
  
  constructor(
    message: string,
    code: string,
    details?: any,
    phase?: string
  ) {
    super(message)
    this.code = code
    this.details = details
    this.phase = phase
    this.requestId = generateRequestId()
  }
  
  toJSON(): APIError {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      phase: this.phase as any
    }
  }
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ユーザー向けのエラーメッセージ
export const UserFriendlyMessages: Record<string, string> = {
  [ErrorCodes.PERPLEXITY_API_KEY_MISSING]: '情報収集サービスの設定に問題があります',
  [ErrorCodes.PERPLEXITY_API_ERROR]: '情報収集中にエラーが発生しました',
  [ErrorCodes.PERPLEXITY_TIMEOUT]: '情報収集がタイムアウトしました',
  [ErrorCodes.PERPLEXITY_INVALID_RESPONSE]: '情報収集の結果が正しく取得できませんでした',
  
  [ErrorCodes.GPT_API_KEY_MISSING]: 'コンセプト生成サービスの設定に問題があります',
  [ErrorCodes.GPT_API_ERROR]: 'コンセプト生成中にエラーが発生しました',
  [ErrorCodes.GPT_INVALID_TOPICS]: 'トピック情報が正しく取得できませんでした',
  [ErrorCodes.GPT_GENERATION_FAILED]: 'コンセプトの生成に失敗しました',
  
  [ErrorCodes.CLAUDE_API_KEY_MISSING]: '投稿生成サービスの設定に問題があります',
  [ErrorCodes.CLAUDE_API_ERROR]: '投稿生成中にエラーが発生しました',
  [ErrorCodes.CLAUDE_NO_CONCEPTS]: 'コンセプトが選択されていません',
  [ErrorCodes.CLAUDE_GENERATION_FAILED]: '投稿の生成に失敗しました',
  
  [ErrorCodes.SESSION_NOT_FOUND]: 'セッションが見つかりません',
  [ErrorCodes.SESSION_INVALID_STATE]: 'セッションの状態が不正です',
  [ErrorCodes.SESSION_ALREADY_COMPLETED]: 'このセッションは既に完了しています',
  
  [ErrorCodes.DB_CONNECTION_ERROR]: 'データベース接続エラーが発生しました',
  [ErrorCodes.DB_TRANSACTION_FAILED]: 'データの保存に失敗しました',
  
  [ErrorCodes.TWITTER_AUTH_MISSING]: 'Twitter認証が必要です',
  [ErrorCodes.TWITTER_POST_FAILED]: '投稿に失敗しました',
  [ErrorCodes.TWITTER_RATE_LIMIT]: 'Twitter APIの利用制限に達しました'
}