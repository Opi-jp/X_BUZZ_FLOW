/**
 * 非同期処理とタイムアウト対策
 * 
 * Vercelの制限:
 * - 無料プラン: 10秒
 * - Pro: 300秒（5分）
 * 
 * 戦略:
 * 1. 即座にレスポンスを返す
 * 2. バックグラウンドで処理
 * 3. ポーリングで結果取得
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/generated/prisma'
import { nanoid } from 'nanoid'

// ジョブの状態
export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// ジョブの結果を保存するテーブル（既存のJobQueueを使用）
export interface AsyncJob {
  id: string
  type: string
  status: JobStatus
  payload: any
  result?: any
  error?: string
  createdAt: Date
  completedAt?: Date
}

/**
 * 長時間処理を非同期で実行
 */
export class AsyncJobHandler {
  /**
   * ジョブを作成して即座にレスポンスを返す
   */
  static async createJob(
    type: string,
    payload: any,
    options?: {
      priority?: number
      maxAttempts?: number
    }
  ): Promise<string> {
    const job = await prisma.jobQueue.create({
      data: {
        id: nanoid(),
        type,
        payload,
        status: JobStatus.PENDING,
        priority: options?.priority || 0,
        maxAttempts: options?.maxAttempts || 3,
        runAt: new Date()
      }
    })
    
    return job.id
  }
  
  /**
   * ジョブの状態を取得
   */
  static async getJobStatus(jobId: string) {
    const job = await prisma.jobQueue.findUnique({
      where: { id: jobId }
    })
    
    if (!job) {
      return null
    }
    
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      result: job.payload, // 結果はpayloadに上書き保存
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }
  }
  
  /**
   * 即座にレスポンスを返すラッパー
   */
  static immediateResponse(jobId: string): NextResponse {
    return NextResponse.json({
      jobId,
      status: JobStatus.PENDING,
      message: '処理を開始しました。jobIdを使って進捗を確認してください。',
      checkUrl: `/api/jobs/${jobId}`
    }, { status: 202 }) // 202 Accepted
  }
  
  /**
   * バックグラウンドで処理を実行
   */
  static async processInBackground(
    jobId: string,
    processor: () => Promise<any>
  ) {
    // 即座に実行せず、setTimeoutで非同期化
    setTimeout(async () => {
      try {
        // ステータスを処理中に更新
        await prisma.jobQueue.update({
          where: { id: jobId },
          data: { 
            status: JobStatus.PROCESSING,
            attempts: { increment: 1 }
          }
        })
        
        // 実際の処理を実行
        const result = await processor()
        
        // 結果を保存
        await prisma.jobQueue.update({
          where: { id: jobId },
          data: {
            status: JobStatus.COMPLETED,
            payload: result, // 結果で上書き
            completedAt: new Date()
          }
        })
      } catch (error: any) {
        // エラーを保存
        await prisma.jobQueue.update({
          where: { id: jobId },
          data: {
            status: JobStatus.FAILED,
            error: error.message || 'Unknown error',
            completedAt: new Date()
          }
        })
      }
    }, 100) // 100ms後に実行
  }
}

/**
 * タイムアウトを回避するAPIハンドラーラッパー
 */
export function withAsyncHandler(
  handler: (request: Request, params?: any) => Promise<any>,
  options?: {
    type: string
    timeout?: number
  }
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      // リクエストボディを取得
      const body = await request.json().catch(() => ({}))
      
      // 非同期モードかチェック
      const isAsync = body._async === true || 
                     request.headers.get('X-Async-Mode') === 'true'
      
      if (isAsync) {
        // ジョブを作成
        const jobId = await AsyncJobHandler.createJob(
          options?.type || 'async-task',
          body
        )
        
        // バックグラウンドで処理
        AsyncJobHandler.processInBackground(jobId, async () => {
          return await handler(request, body)
        })
        
        // 即座にレスポンス
        return AsyncJobHandler.immediateResponse(jobId)
      } else {
        // 通常の同期処理
        const result = await handler(request, body)
        return NextResponse.json(result)
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
  }
}

/**
 * ポーリング用のヘルパー関数（クライアント側で使用）
 */
export async function pollJobStatus(
  jobId: string,
  options?: {
    interval?: number
    maxAttempts?: number
    onProgress?: (status: JobStatus) => void
  }
): Promise<any> {
  const interval = options?.interval || 2000 // 2秒
  const maxAttempts = options?.maxAttempts || 30 // 最大1分
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/jobs/${jobId}`)
    const data = await response.json()
    
    if (options?.onProgress) {
      options.onProgress(data.status)
    }
    
    if (data.status === JobStatus.COMPLETED) {
      return data.result
    }
    
    if (data.status === JobStatus.FAILED) {
      throw new Error(data.error || 'Job failed')
    }
    
    // 待機
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error('Job timeout')
}

/**
 * 処理時間を推定してモードを自動選択
 */
export function shouldUseAsyncMode(
  estimatedDuration: number,
  isVercel: boolean = !!process.env.VERCEL
): boolean {
  // Vercelの場合
  if (isVercel) {
    const isPro = process.env.VERCEL_PLAN === 'pro'
    const limit = isPro ? 300000 : 10000 // Pro: 5分、Free: 10秒
    return estimatedDuration > limit * 0.8 // 80%で非同期に切り替え
  }
  
  // ローカルの場合は30秒以上で非同期
  return estimatedDuration > 30000
}