/**
 * CoTセッション管理
 * 
 * エラー時のリトライ、復旧、リスタート機能を提供
 */

import { prisma } from '@/lib/prisma'
import { CotSessionStatus } from '@prisma/client'

export interface SessionRecoveryOptions {
  maxRetries?: number
  retryDelay?: number // ミリ秒
  allowPartialRestart?: boolean // Phase単位での再開を許可
  skipFailedSteps?: boolean // 失敗したステップをスキップ（非推奨）
}

export class CotSessionManager {
  private readonly defaultOptions: SessionRecoveryOptions = {
    maxRetries: 3,
    retryDelay: 5000,
    allowPartialRestart: true,
    skipFailedSteps: false
  }

  /**
   * セッションの健全性をチェック
   */
  async checkSessionHealth(sessionId: string): Promise<{
    isHealthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: { phases: true }
    })

    if (!session) {
      return {
        isHealthy: false,
        issues: ['Session not found'],
        recommendations: ['Create a new session']
      }
    }

    const issues: string[] = []
    const recommendations: string[] = []

    // 1. タイムアウトチェック
    const timeSinceUpdate = Date.now() - new Date(session.updatedAt).getTime()
    if (timeSinceUpdate > 5 * 60 * 1000) { // 5分以上
      issues.push(`Session stuck for ${Math.round(timeSinceUpdate / 60000)} minutes`)
      recommendations.push('Restart from current phase')
    }

    // 2. リトライ回数チェック
    if (session.retryCount >= 5) {
      issues.push('Too many retries')
      recommendations.push('Start fresh session')
    }

    // 3. エラー状態チェック
    if (session.status === 'FAILED') {
      issues.push(`Failed with: ${session.lastError}`)
      if (session.lastError?.includes('token limit')) {
        recommendations.push('Reduce content size and retry')
      } else if (session.lastError?.includes('rate limit')) {
        recommendations.push('Wait and retry')
      } else {
        recommendations.push('Retry from last successful step')
      }
    }

    // 4. フェーズの整合性チェック
    for (const phase of session.phases) {
      if (phase.status === 'COMPLETED') {
        if (!phase.thinkResult || !phase.integrateResult) {
          issues.push(`Phase ${phase.phaseNumber} incomplete despite COMPLETED status`)
          recommendations.push(`Restart phase ${phase.phaseNumber}`)
        }
      }
    }

    // 5. 依存関係チェック
    if (session.currentPhase > 1) {
      const prevPhase = session.phases.find(p => p.phaseNumber === session.currentPhase - 1)
      if (!prevPhase || prevPhase.status !== 'COMPLETED') {
        issues.push(`Phase ${session.currentPhase - 1} not completed`)
        recommendations.push(`Restart from phase ${session.currentPhase - 1}`)
      }
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * セッションをリトライ
   */
  async retrySession(
    sessionId: string, 
    options?: SessionRecoveryOptions
  ): Promise<{
    success: boolean
    action: 'retry' | 'restart_phase' | 'restart_session' | 'abort'
    message: string
    newSessionId?: string
  }> {
    const opts = { ...this.defaultOptions, ...options }
    
    const health = await this.checkSessionHealth(sessionId)
    
    if (!health.isHealthy) {
      console.log('[SESSION MANAGER] Health check failed:', health)
      
      // 推奨事項に基づいて判断
      if (health.recommendations.includes('Start fresh session')) {
        return await this.restartSession(sessionId, 'Too many failures')
      }
      
      if (health.recommendations.some(r => r.includes('Restart phase'))) {
        const phaseMatch = health.recommendations[0].match(/phase (\d+)/)
        if (phaseMatch) {
          const phaseNum = parseInt(phaseMatch[1])
          return await this.restartFromPhase(sessionId, phaseNum)
        }
      }
    }

    // 通常のリトライ
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return {
        success: false,
        action: 'abort',
        message: 'Session not found'
      }
    }

    // リトライ回数チェック
    if (session.retryCount >= (opts.maxRetries || 3)) {
      return await this.restartSession(sessionId, 'Max retries exceeded')
    }

    // リトライ実行
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        retryCount: { increment: 1 },
        lastError: null,
        nextRetryAt: new Date(Date.now() + (opts.retryDelay || 5000))
      }
    })

    return {
      success: true,
      action: 'retry',
      message: `Retrying session (attempt ${session.retryCount + 1})`
    }
  }

  /**
   * 特定のフェーズから再開
   */
  async restartFromPhase(
    sessionId: string, 
    phaseNumber: number
  ): Promise<{
    success: boolean
    action: 'restart_phase'
    message: string
  }> {
    console.log(`[SESSION MANAGER] Restarting from phase ${phaseNumber}`)

    // 指定フェーズ以降のデータを削除
    await prisma.cotPhase.deleteMany({
      where: {
        sessionId,
        phaseNumber: { gte: phaseNumber }
      }
    })

    // セッションを更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentPhase: phaseNumber,
        currentStep: 'THINK',
        status: 'PENDING',
        retryCount: 0,
        lastError: null
      }
    })

    return {
      success: true,
      action: 'restart_phase',
      message: `Session restarted from phase ${phaseNumber}`
    }
  }

  /**
   * 新しいセッションで最初から
   */
  async restartSession(
    oldSessionId: string,
    reason: string
  ): Promise<{
    success: boolean
    action: 'restart_session'
    message: string
    newSessionId: string
  }> {
    const oldSession = await prisma.cotSession.findUnique({
      where: { id: oldSessionId }
    })

    if (!oldSession) {
      throw new Error('Old session not found')
    }

    // 古いセッションを失敗として記録
    await prisma.cotSession.update({
      where: { id: oldSessionId },
      data: {
        status: 'FAILED',
        lastError: `Restarted: ${reason}`
      }
    })

    // 新しいセッションを作成
    const newSession = await prisma.cotSession.create({
      data: {
        theme: oldSession.theme,
        style: oldSession.style,
        platform: oldSession.platform,
        status: 'PENDING',
        currentPhase: 1,
        currentStep: 'THINK'
      }
    })

    return {
      success: true,
      action: 'restart_session',
      message: `New session created due to: ${reason}`,
      newSessionId: newSession.id
    }
  }

  /**
   * 適切な復旧アクションを決定
   */
  async determineRecoveryAction(
    sessionId: string,
    error: any
  ): Promise<{
    action: 'retry' | 'restart_phase' | 'restart_session' | 'wait' | 'abort'
    delay?: number
    reason: string
  }> {
    const errorMessage = error?.message || String(error)

    // エラータイプ別の判断
    if (errorMessage.includes('rate limit')) {
      return {
        action: 'wait',
        delay: 60000, // 1分待機
        reason: 'API rate limit'
      }
    }

    if (errorMessage.includes('token limit') || errorMessage.includes('context length')) {
      return {
        action: 'restart_phase',
        reason: 'Token limit exceeded - need to reduce content'
      }
    }

    if (errorMessage.includes('timeout')) {
      const session = await prisma.cotSession.findUnique({
        where: { id: sessionId }
      })
      
      if (session && session.retryCount < 2) {
        return {
          action: 'retry',
          reason: 'Timeout - retrying'
        }
      } else {
        return {
          action: 'restart_phase',
          reason: 'Multiple timeouts - restarting phase'
        }
      }
    }

    if (errorMessage.includes('Execute result not found') || 
        errorMessage.includes('Think result not found')) {
      return {
        action: 'restart_phase',
        reason: 'Missing required data'
      }
    }

    // デフォルト: リトライ
    return {
      action: 'retry',
      reason: 'General error'
    }
  }
}