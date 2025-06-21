// フロー関連の型定義

export interface FlowStep {
  id: number
  name: string
  description?: string
  status: 'pending' | 'current' | 'completed' | 'error'
  startedAt?: Date
  completedAt?: Date
  error?: string
  data?: any
}

export interface FlowSession {
  id: string
  theme: string
  platform: string
  style: string
  postFormat?: 'single' | 'thread' // 投稿形式
  currentStep: number
  steps: FlowStep[]
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

// APIフェーズとステップのマッピング
export const STEP_TO_API_PHASE: Record<number, string> = {
  1: 'INPUT', // テーマ入力
  2: 'CREATE_SESSION', // DB保存
  3: 'PREPARE_PERPLEXITY', // プロンプト準備
  4: 'COLLECT_TOPICS', // Perplexity実行
  5: 'SAVE_TOPICS', // トピック保存
  6: 'DISPLAY_TOPICS', // トピック表示
  7: 'PREPARE_GPT', // GPT準備
  8: 'GENERATE_CONCEPTS', // コンセプト生成
  9: 'SAVE_CONCEPTS', // コンセプト保存
  10: 'SELECT_CONCEPTS', // コンセプト選択
  11: 'PREPARE_CLAUDE', // Claude準備
  12: 'GENERATE_CONTENTS', // 投稿文生成
  13: 'SAVE_CONTENTS', // 投稿文保存
  14: 'DISPLAY_CONTENTS', // 投稿文表示
  15: 'CREATE_DRAFT', // 下書き作成
  16: 'CONFIRM_DRAFT' // 下書き確認
}

// ステップのグループ定義
export const STEP_GROUPS = {
  COLLECTION: [1, 2, 3, 4, 5, 6], // 情報収集フェーズ
  GENERATION: [7, 8, 9, 10], // コンセプト生成フェーズ
  CONTENT: [11, 12, 13, 14], // コンテンツ作成フェーズ
  FINALIZATION: [15, 16] // 最終確認フェーズ
}

// ユーザー入力が必要なステップ
export const USER_INPUT_STEPS = [1, 10, 14, 16]

// 自動実行されるステップ
export const AUTO_EXECUTE_STEPS = [2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15]

// API呼び出しが必要なステップ
export const API_CALL_STEPS = [2, 4, 8, 12, 15]

// エラーリトライ可能なステップ
export const RETRYABLE_STEPS = [4, 8, 12]