/**
 * 非同期API処理システム
 * 
 * GPT、Perplexityなどの外部APIを非同期で処理し、
 * 完了時にトリガーで次の処理を実行
 */

import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { PerplexityClient } from './perplexity'

export type ApiTaskType = 'GPT_COMPLETION' | 'PERPLEXITY_SEARCH'
export type ApiTaskStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface ApiTask {
  id: string
  type: ApiTaskType
  sessionId: string
  phaseNumber: number
  stepName: string
  request: any
  status: ApiTaskStatus
  retryCount: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  response?: any
  error?: string
}

export class AsyncApiProcessor {
  private static instance: AsyncApiProcessor
  private openai: OpenAI
  private perplexity: PerplexityClient
  private processing = false
  private pollInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.perplexity = new PerplexityClient()
  }

  static getInstance(): AsyncApiProcessor {
    if (!AsyncApiProcessor.instance) {
      AsyncApiProcessor.instance = new AsyncApiProcessor()
    }
    return AsyncApiProcessor.instance
  }

  /**
   * APIタスクをキューに追加
   */
  async queueTask(
    type: ApiTaskType,
    sessionId: string,
    phaseNumber: number,
    stepName: string,
    request: any
  ): Promise<string> {
    // タスクをDBに保存（生のSQLを使用）
    const result = await prisma.$queryRaw`
      INSERT INTO api_tasks (id, type, session_id, phase_number, step_name, request, status, retry_count, created_at)
      VALUES (gen_random_uuid()::text, ${type}, ${sessionId}, ${phaseNumber}, ${stepName}, ${JSON.stringify(request)}::jsonb, 'QUEUED', 0, NOW())
      RETURNING id
    `
    
    const task = { id: (result as any)[0].id }

    console.log(`[ASYNC API] Queued ${type} task ${task.id} for session ${sessionId}`)

    // 処理開始
    this.startProcessing()

    return task.id
  }

  /**
   * 複数のタスクをバッチでキュー
   */
  async queueBatch(
    tasks: Array<{
      type: ApiTaskType
      sessionId: string
      phaseNumber: number
      stepName: string
      request: any
    }>
  ): Promise<string[]> {
    const taskIds = []

    for (const task of tasks) {
      const id = await this.queueTask(
        task.type,
        task.sessionId,
        task.phaseNumber,
        task.stepName,
        task.request
      )
      taskIds.push(id)
    }

    return taskIds
  }

  /**
   * タスク処理を開始
   */
  private startProcessing() {
    if (this.processing) return

    this.processing = true
    this.processQueue()

    // 定期的にキューをチェック
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        this.processQueue()
      }, 5000) // 5秒ごと
    }
  }

  /**
   * キューを処理
   */
  private async processQueue() {
    // 同時処理数の制限
    const maxConcurrent = 3
    const processingCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM api_tasks WHERE status = 'PROCESSING'
    `
    const processingCount = Number((processingCountResult as any)[0].count)

    if (processingCount >= maxConcurrent) {
      return
    }

    // 次のタスクを取得
    const tasks = await prisma.$queryRaw`
      SELECT * FROM api_tasks 
      WHERE status = 'QUEUED' AND retry_count < 3
      ORDER BY created_at ASC
      LIMIT ${maxConcurrent - processingCount}
    `

    if ((tasks as any[]).length === 0 && processingCount === 0) {
      this.processing = false
      if (this.pollInterval) {
        clearInterval(this.pollInterval)
        this.pollInterval = null
      }
      return
    }

    // タスクを並列処理
    await Promise.all((tasks as any[]).map(task => this.processTask(task)))
  }

  /**
   * 個別タスクを処理
   */
  private async processTask(task: any) {
    try {
      // 処理中にマーク
      await prisma.$executeRaw`
        UPDATE api_tasks 
        SET status = 'PROCESSING', started_at = NOW()
        WHERE id = ${task.id}
      `

      console.log(`[ASYNC API] Processing ${task.type} task ${task.id}`)

      let response
      switch (task.type) {
        case 'GPT_COMPLETION':
          response = await this.processGptTask(task.request)
          break
        case 'PERPLEXITY_SEARCH':
          response = await this.processPerplexityTask(task.request)
          break
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      // 成功
      await prisma.$executeRaw`
        UPDATE api_tasks 
        SET status = 'COMPLETED', 
            completed_at = NOW(),
            response = ${JSON.stringify(response)}::jsonb
        WHERE id = ${task.id}
      `

      // セッション処理を再開
      await this.triggerSessionContinue(task.session_id, task.id)

    } catch (error) {
      console.error(`[ASYNC API] Task ${task.id} failed:`, error)

      // エラー処理
      await prisma.$executeRaw`
        UPDATE api_tasks 
        SET status = 'FAILED',
            error = ${error instanceof Error ? error.message : 'Unknown error'},
            retry_count = retry_count + 1
        WHERE id = ${task.id}
      `

      // リトライ可能な場合
      if (task.retry_count < 2) {
        setTimeout(async () => {
          await prisma.$executeRaw`
            UPDATE api_tasks SET status = 'QUEUED' WHERE id = ${task.id}
          `
        }, 10000 * (task.retry_count + 1)) // 10秒、20秒でリトライ
      } else {
        // 最終的に失敗
        await this.handleTaskFailure(task)
      }
    }
  }

  /**
   * GPTタスクを処理
   */
  private async processGptTask(request: any): Promise<any> {
    const { messages, model, temperature, maxTokens, responseFormat } = request

    const completion = await this.openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages,
      temperature: temperature || 0.7,
      max_tokens: maxTokens,
      response_format: responseFormat
    })

    return {
      content: completion.choices[0].message.content,
      usage: completion.usage,
      model: completion.model
    }
  }

  /**
   * Perplexityタスクを処理
   */
  private async processPerplexityTask(request: any): Promise<any> {
    const { query, systemPrompt } = request

    const response = await this.perplexity.searchWithContext({
      query,
      systemPrompt
    })

    return {
      content: response.choices?.[0]?.message?.content || response,
      citations: response.citations || [],
      searchResults: response.search_results || []
    }
  }

  /**
   * セッション処理を再開
   */
  private async triggerSessionContinue(sessionId: string, taskId: string) {
    console.log(`[ASYNC API] Triggering session continue for ${sessionId}`)

    // セッションの状態を確認
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) return

    // セッションメタデータを更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        metadata: {
          ...(session.metadata as any || {}),
          lastCompletedTaskId: taskId,
          lastTaskCompletedAt: new Date().toISOString()
        } as any
      }
    })

    // 開発環境では直接APIを呼び出し
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/continue-async`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId })
        })
        console.log(`[ASYNC API] Continue triggered: ${response.status}`)
      } catch (error) {
        console.error('[ASYNC API] Failed to trigger continue:', error)
      }
    }

    // 本番環境ではWebhookやメッセージキューを使用
    // await this.sendWebhook(sessionId, taskId)
  }

  /**
   * タスク失敗時の処理
   */
  private async handleTaskFailure(task: any) {
    // セッションにエラーを記録
    await prisma.cotSession.update({
      where: { id: task.sessionId },
      data: {
        status: 'FAILED',
        lastError: `API task ${task.id} failed after ${task.retryCount + 1} attempts`
      }
    })
  }

  /**
   * タスクのステータスを取得
   */
  async getTaskStatus(taskId: string): Promise<ApiTask | null> {
    const result = await prisma.$queryRaw`
      SELECT * FROM api_tasks WHERE id = ${taskId}
    `
    return (result as any[])[0] || null
  }

  /**
   * セッションの全タスクステータスを取得
   */
  async getSessionTasks(sessionId: string): Promise<{
    total: number
    queued: number
    processing: number
    completed: number
    failed: number
    tasks: ApiTask[]
  }> {
    const tasks = await prisma.$queryRaw`
      SELECT * FROM api_tasks 
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
    ` as any[]

    const stats = {
      total: tasks.length,
      queued: tasks.filter(t => t.status === 'QUEUED').length,
      processing: tasks.filter(t => t.status === 'PROCESSING').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      failed: tasks.filter(t => t.status === 'FAILED' && t.retry_count >= 3).length,
      tasks
    }

    return stats
  }

  /**
   * タスクの応答を取得
   */
  async getTaskResponse(taskId: string): Promise<any> {
    const result = await prisma.$queryRaw`
      SELECT response FROM api_tasks 
      WHERE id = ${taskId} AND status = 'COMPLETED'
    `

    if ((result as any[]).length === 0) {
      return null
    }

    return (result as any[])[0].response
  }
}