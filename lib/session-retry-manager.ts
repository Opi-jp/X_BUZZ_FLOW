/**
 * セッションのリトライと再開を管理するモジュール
 * モックデータは使用せず、エラー時は適切にリトライまたは失敗として扱う
 */

import { prisma } from './prisma'
import { CotSessionStatus, CotPhaseStep } from '@prisma/client'

interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  maxDelay: 30000,    // 30秒
  backoffMultiplier: 2
}

export class SessionRetryManager {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * 指数バックオフでリトライを実行
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { sessionId: string; phase: number; step: string }
  ): Promise<T> {
    let lastError: Error | null = null
    let delay = this.config.initialDelay

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`[RETRY] Attempt ${attempt}/${this.config.maxRetries} for session ${context.sessionId}, phase ${context.phase}, step ${context.step}`)
        
        const result = await operation()
        
        // 成功したらリトライカウントをリセット
        await this.resetRetryCount(context.sessionId)
        
        return result
      } catch (error) {
        lastError = error as Error
        console.error(`[RETRY] Attempt ${attempt} failed:`, error)

        // リトライ情報を記録
        await this.recordRetryAttempt(context.sessionId, attempt, lastError.message)

        if (attempt < this.config.maxRetries) {
          console.log(`[RETRY] Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay)
        }
      }
    }

    // 全てのリトライが失敗した場合
    await this.markSessionAsFailed(context.sessionId, lastError?.message || 'Max retries exceeded')
    throw new Error(`Failed after ${this.config.maxRetries} attempts: ${lastError?.message}`)
  }

  /**
   * セッションの再開可能性をチェック
   */
  async canResumeSession(sessionId: string): Promise<boolean> {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phase: 'asc' }
        }
      }
    })

    if (!session) return false

    // FAILED状態でもリトライ回数が上限に達していなければ再開可能
    if (session.status === 'FAILED' && session.retryCount < this.config.maxRetries) {
      return true
    }

    // INTEGRATING, EXECUTING, THINKING状態で止まっている場合は再開可能
    if (['INTEGRATING', 'EXECUTING', 'THINKING'].includes(session.status)) {
      // 最後の更新から5分以上経過していれば再開可能
      const lastUpdate = new Date(session.updatedAt).getTime()
      const now = Date.now()
      return (now - lastUpdate) > 5 * 60 * 1000
    }

    return false
  }

  /**
   * セッションを再開
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phase: 'asc' }
        }
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // 再開のための状態をリセット
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        lastError: null,
        updatedAt: new Date()
      }
    })

    console.log(`[RESUME] Session ${sessionId} marked for resumption`)
  }

  /**
   * セッションの進捗状態を取得
   */
  async getSessionProgress(sessionId: string): Promise<{
    completedPhases: number[]
    currentPhase: number
    currentStep: CotPhaseStep
    hasErrors: boolean
  }> {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phase: 'asc' }
        }
      }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    const completedPhases = session.phases
      .filter(p => p.integrateResult !== null)
      .map(p => p.phase)

    return {
      completedPhases,
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      hasErrors: !!session.lastError
    }
  }

  /**
   * リトライ回数をリセット
   */
  private async resetRetryCount(sessionId: string): Promise<void> {
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: { retryCount: 0 }
    })
  }

  /**
   * リトライ試行を記録
   */
  private async recordRetryAttempt(
    sessionId: string,
    attempt: number,
    errorMessage: string
  ): Promise<void> {
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        retryCount: attempt,
        lastError: errorMessage,
        updatedAt: new Date()
      }
    })
  }

  /**
   * セッションを失敗状態にマーク
   */
  private async markSessionAsFailed(
    sessionId: string,
    errorMessage: string
  ): Promise<void> {
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        lastError: errorMessage,
        updatedAt: new Date()
      }
    })
  }

  /**
   * 部分的な結果を保存（再開時に使用）
   */
  async savePartialResult(
    sessionId: string,
    phase: number,
    step: CotPhaseStep,
    result: any
  ): Promise<void> {
    const columnMap = {
      THINK: 'thinkResult',
      EXECUTE: 'executeResult',
      INTEGRATE: 'integrateResult'
    }

    const column = columnMap[step]
    if (!column) return

    await prisma.cotPhase.upsert({
      where: {
        sessionId_phase: { sessionId, phase }
      },
      update: {
        [column]: result,
        updatedAt: new Date()
      },
      create: {
        sessionId,
        phase,
        [column]: result
      }
    })
  }
}

// シングルトンインスタンス
export const sessionRetryManager = new SessionRetryManager()