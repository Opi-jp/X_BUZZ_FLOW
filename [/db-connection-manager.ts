/**
 * データベース接続マネージャー
 * 接続の管理、監視、自動リカバリを提供
 */

import { prisma, prismaDirect, checkDatabaseHealth, withRetry } from './prisma-stable'

export interface ConnectionStats {
  totalQueries: number
  failedQueries: number
  averageResponseTime: number
  lastError?: string
  lastErrorTime?: Date
}

export class DBConnectionManager {
  private static instance: DBConnectionManager
  private stats: ConnectionStats = {
    totalQueries: 0,
    failedQueries: 0,
    averageResponseTime: 0
  }
  private queryTimes: number[] = []
  private isMonitoring = false

  private constructor() {}

  static getInstance(): DBConnectionManager {
    if (!this.instance) {
      this.instance = new DBConnectionManager()
    }
    return this.instance
  }

  /**
   * 監視を開始
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    
    setInterval(async () => {
      const health = await checkDatabaseHealth()
      
      if (!health.isHealthy) {
        console.error('[DBManager] Database unhealthy:', health.error)
        await this.attemptRecovery()
      }
      
      // 統計情報をログ
      if (this.stats.totalQueries > 0) {
        console.log('[DBManager] Stats:', {
          ...this.stats,
          successRate: ((this.stats.totalQueries - this.stats.failedQueries) / this.stats.totalQueries * 100).toFixed(2) + '%'
        })
      }
    }, intervalMs)
  }

  /**
   * クエリを実行（計測付き）
   */
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    options: {
      useDirect?: boolean
      maxRetries?: number
    } = {}
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await withRetry(queryFn, {
        maxRetries: options.maxRetries || 3,
        onRetry: (attempt, error) => {
          console.warn(`[DBManager] Query retry ${attempt}:`, error.message)
        }
      })
      
      // 成功時の統計更新
      const duration = Date.now() - startTime
      this.updateStats(duration, true)
      
      return result
    } catch (error) {
      // 失敗時の統計更新
      const duration = Date.now() - startTime
      this.updateStats(duration, false, error as Error)
      
      throw error
    }
  }

  /**
   * トランザクションを実行
   */
  async executeTransaction<T>(
    transactionFn: (tx: any) => Promise<T>,
    options: {
      maxRetries?: number
      isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable'
    } = {}
  ): Promise<T> {
    return this.executeQuery(
      () => prisma.$transaction(transactionFn, {
        isolationLevel: options.isolationLevel,
        maxWait: 5000,
        timeout: 30000
      }),
      { maxRetries: options.maxRetries }
    )
  }

  /**
   * 統計情報を更新
   */
  private updateStats(duration: number, success: boolean, error?: Error): void {
    this.stats.totalQueries++
    
    if (!success) {
      this.stats.failedQueries++
      this.stats.lastError = error?.message
      this.stats.lastErrorTime = new Date()
    }
    
    // 平均応答時間の計算（直近100クエリ）
    this.queryTimes.push(duration)
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift()
    }
    
    this.stats.averageResponseTime = 
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
  }

  /**
   * 接続のリカバリを試行
   */
  private async attemptRecovery(): Promise<void> {
    console.log('[DBManager] Attempting connection recovery...')
    
    try {
      // 既存の接続をクローズ
      await prisma.$disconnect()
      await prismaDirect.$disconnect()
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 再接続テスト
      await prisma.$connect()
      const health = await checkDatabaseHealth()
      
      if (health.isHealthy) {
        console.log('[DBManager] Recovery successful')
      } else {
        console.error('[DBManager] Recovery failed:', health.error)
      }
    } catch (error) {
      console.error('[DBManager] Recovery error:', error)
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): ConnectionStats {
    return { ...this.stats }
  }

  /**
   * 統計情報をリセット
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0
    }
    this.queryTimes = []
  }
}

// シングルトンインスタンス
export const dbManager = DBConnectionManager.getInstance()

// 開発環境では自動的に監視を開始
if (process.env.NODE_ENV === 'development') {
  dbManager.startMonitoring(30000) // 30秒ごと
}