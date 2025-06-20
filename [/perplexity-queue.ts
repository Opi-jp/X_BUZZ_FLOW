/**
 * Perplexity APIキューイングシステム
 * 
 * リクエストをキューに入れて、応答が来たら処理を再開する
 * コスト削減とタイムアウト対策
 */

import { prisma } from '@/lib/prisma'
import { PerplexityClient } from './perplexity'

export interface PerplexityQueueItem {
  id: string
  sessionId: string
  phaseNumber: number
  stepName: string
  request: {
    query: string
    systemPrompt?: string
    category?: string
    strategicIntent?: string
    viralAngle?: string
  }
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  retryCount: number
  createdAt: Date
  processedAt?: Date
  response?: any
  error?: string
}

export class PerplexityQueue {
  private static instance: PerplexityQueue
  private processing = false
  private client: PerplexityClient

  private constructor() {
    this.client = new PerplexityClient()
  }

  static getInstance(): PerplexityQueue {
    if (!PerplexityQueue.instance) {
      PerplexityQueue.instance = new PerplexityQueue()
    }
    return PerplexityQueue.instance
  }

  /**
   * リクエストをキューに追加
   */
  async enqueue(
    sessionId: string,
    phaseNumber: number,
    queries: Array<{
      query: string
      category?: string
      strategicIntent?: string
      viralAngle?: string
    }>
  ): Promise<string[]> {
    console.log(`[PERPLEXITY QUEUE] Enqueueing ${queries.length} queries for session ${sessionId}`)
    
    const queueIds: string[] = []
    
    for (const query of queries) {
      // キューアイテムをDBに保存
      const queueItem = await prisma.perplexityQueue.create({
        data: {
          sessionId,
          phaseNumber,
          stepName: 'EXECUTE',
          request: query as any,
          status: 'PENDING',
          retryCount: 0
        }
      })
      
      queueIds.push(queueItem.id)
    }
    
    // セッションをキュー待ち状態に更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'WAITING_PERPLEXITY',
        metadata: {
          queueIds,
          queueStartTime: new Date().toISOString()
        } as any
      }
    })
    
    // バックグラウンド処理を開始（既に実行中でなければ）
    if (!this.processing) {
      this.startProcessing()
    }
    
    return queueIds
  }

  /**
   * キューの処理を開始
   */
  private async startProcessing() {
    if (this.processing) return
    
    this.processing = true
    console.log('[PERPLEXITY QUEUE] Starting queue processing')
    
    while (true) {
      try {
        // 次のアイテムを取得
        const nextItem = await prisma.perplexityQueue.findFirst({
          where: {
            status: 'PENDING',
            retryCount: { lt: 3 }
          },
          orderBy: { createdAt: 'asc' }
        })
        
        if (!nextItem) {
          console.log('[PERPLEXITY QUEUE] No pending items, stopping processing')
          break
        }
        
        // 処理中にマーク
        await prisma.perplexityQueue.update({
          where: { id: nextItem.id },
          data: { 
            status: 'PROCESSING',
            processedAt: new Date()
          }
        })
        
        // Perplexity APIを呼び出し
        console.log(`[PERPLEXITY QUEUE] Processing item ${nextItem.id}`)
        
        try {
          const response = await this.callPerplexityWithRetry(nextItem.request)
          
          // 成功した場合
          await prisma.perplexityQueue.update({
            where: { id: nextItem.id },
            data: {
              status: 'COMPLETED',
              response: response as any
            }
          })
          
          // セッションの処理を再開するかチェック
          await this.checkAndResumeSession(nextItem.sessionId)
          
        } catch (error) {
          console.error(`[PERPLEXITY QUEUE] Error processing item ${nextItem.id}:`, error)
          
          // エラーの場合
          await prisma.perplexityQueue.update({
            where: { id: nextItem.id },
            data: {
              status: 'FAILED',
              error: error instanceof Error ? error.message : 'Unknown error',
              retryCount: { increment: 1 }
            }
          })
          
          // リトライ可能な場合は再度PENDINGに
          if (nextItem.retryCount < 2) {
            setTimeout(async () => {
              await prisma.perplexityQueue.update({
                where: { id: nextItem.id },
                data: { status: 'PENDING' }
              })
            }, 30000) // 30秒後にリトライ
          }
        }
        
        // レート制限対策（リクエスト間に遅延）
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error('[PERPLEXITY QUEUE] Unexpected error:', error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
    this.processing = false
  }

  /**
   * Perplexity APIをリトライ付きで呼び出し
   */
  private async callPerplexityWithRetry(request: any, maxRetries = 2): Promise<any> {
    let lastError
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[PERPLEXITY QUEUE] Attempt ${attempt + 1} for query: ${request.query.substring(0, 50)}...`)
        
        const response = await this.client.searchWithContext({
          query: request.query,
          systemPrompt: request.systemPrompt || 'Please provide a comprehensive answer with sources.'
        })
        
        return {
          content: response.choices?.[0]?.message?.content || response,
          citations: response.citations || [],
          searchResults: response.search_results || [],
          request: request
        }
        
      } catch (error) {
        lastError = error
        console.error(`[PERPLEXITY QUEUE] Attempt ${attempt + 1} failed:`, error)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)))
        }
      }
    }
    
    throw lastError
  }

  /**
   * セッションの処理を再開するかチェック
   */
  private async checkAndResumeSession(sessionId: string) {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })
    
    if (!session || session.status !== 'WAITING_PERPLEXITY') {
      return
    }
    
    const metadata = session.metadata as any
    if (!metadata?.queueIds) return
    
    // 全てのキューアイテムが完了したかチェック
    const queueItems = await prisma.perplexityQueue.findMany({
      where: {
        id: { in: metadata.queueIds }
      }
    })
    
    const allCompleted = queueItems.every(item => 
      item.status === 'COMPLETED' || 
      (item.status === 'FAILED' && item.retryCount >= 3)
    )
    
    if (allCompleted) {
      console.log(`[PERPLEXITY QUEUE] All items completed for session ${sessionId}, triggering resume`)
      
      // セッションを再開可能な状態に更新
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'EXECUTING',
          metadata: {
            ...metadata,
            queueCompleted: true,
            queueCompletedAt: new Date().toISOString()
          } as any
        }
      })
      
      // Webhook or イベントトリガー（オプション）
      await this.triggerSessionResume(sessionId)
    }
  }

  /**
   * セッション再開をトリガー
   */
  private async triggerSessionResume(sessionId: string) {
    // オプション1: 内部APIを直接呼び出し
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        console.log(`[PERPLEXITY QUEUE] Session resume triggered: ${response.status}`)
      } catch (error) {
        console.error('[PERPLEXITY QUEUE] Failed to trigger session resume:', error)
      }
    }
    
    // オプション2: WebSocketまたはServer-Sent Eventsで通知（実装が必要）
    // this.notifyClient(sessionId, 'PERPLEXITY_COMPLETED')
  }

  /**
   * キューの状態を取得
   */
  async getQueueStatus(sessionId?: string): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    items?: PerplexityQueueItem[]
  }> {
    const where = sessionId ? { sessionId } : {}
    
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.perplexityQueue.count({ where: { ...where, status: 'PENDING' } }),
      prisma.perplexityQueue.count({ where: { ...where, status: 'PROCESSING' } }),
      prisma.perplexityQueue.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.perplexityQueue.count({ where: { ...where, status: 'FAILED', retryCount: { gte: 3 } } })
    ])
    
    let items
    if (sessionId) {
      items = await prisma.perplexityQueue.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      })
    }
    
    return { pending, processing, completed, failed, items }
  }

  /**
   * キューからレスポンスを取得
   */
  async getQueueResponses(queueIds: string[]): Promise<any[]> {
    const items = await prisma.perplexityQueue.findMany({
      where: {
        id: { in: queueIds },
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'asc' }
    })
    
    return items.map(item => ({
      ...item.response,
      queueId: item.id,
      category: item.request.category,
      strategicIntent: item.request.strategicIntent,
      viralAngle: item.request.viralAngle
    }))
  }
}