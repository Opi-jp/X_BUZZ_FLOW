/**
 * 統合システムのAPI共通型定義
 * 
 * 3層データアーキテクチャ:
 * - Raw Layer: DB保存用の完全データ
 * - Process Layer: ビジネスロジック用
 * - Display Layer: UI表示用の軽量データ
 */

// 共通レスポンス型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any
}

// ページネーション
export interface PaginationParams {
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// データレイヤー型
export interface DisplayData {
  id: string
  title?: string
  summary?: string
  status?: string
  score?: number
  createdAt?: Date
  [key: string]: any
}

export interface ProcessData extends DisplayData {
  metadata?: Record<string, any>
  metrics?: Record<string, number>
  tags?: string[]
}

export interface RawData extends ProcessData {
  fullContent?: string
  analysis?: any
  rawResponse?: any
}

// モジュール別の基本型

// Intel Module
export interface NewsArticleDisplay {
  id: string
  title: string
  summary: string
  score: number
  source: string
  publishedAt: Date
}

export interface SocialMetricsDisplay {
  id: string
  platform: string
  impressions: number
  engagement: number
  viralScore: number
}

// Create Module
export interface FlowSessionDisplay {
  id: string
  theme: string
  status: string
  progress: number
  createdAt: Date
}

export interface DraftDisplay {
  id: string
  title: string
  preview: string
  characterCount: number
  status: string
}

// Publish Module
export interface PostDisplay {
  id: string
  content: string
  scheduledAt?: Date
  postedAt?: Date
  status: string
  platform: string
}

// Analyze Module
export interface MetricsDisplay {
  period: string
  impressions: number
  engagements: number
  growth: number
  topContent: string[]
}