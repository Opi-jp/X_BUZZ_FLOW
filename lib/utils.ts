/**
 * 共通ユーティリティ関数
 * Next.jsプロジェクトで使用される汎用的なヘルパー関数
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSSクラス名を統合する
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 文字列をスラッグ形式に変換
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

/**
 * 日付を相対時間表示に変換
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)
  
  if (diffInSeconds < 60) return `${diffInSeconds}秒前`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}日前`
  
  return target.toLocaleDateString('ja-JP')
}

/**
 * テキストを指定文字数で切り詰める
 */
export function truncate(text: string, length: number = 100): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * 安全にJSONをパースする
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/**
 * APIエラーメッセージを抽出
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error occurred'
}

/**
 * ランダムな文字列を生成
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * URLが有効かチェック
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * オブジェクトから空の値を除去
 */
export function removeEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '' && value !== 0) {
      result[key as keyof T] = value
    }
  }
  
  return result
}

/**
 * 配列をチャンクに分割
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * 重複を除去した配列を返す
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

/**
 * オブジェクトの深いコピーを作成
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  
  const cloned = {} as T
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  
  return cloned
}