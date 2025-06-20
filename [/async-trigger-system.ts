/**
 * 非同期トリガーシステム
 * APIの応答を受け取ったら自動的に次の作業を開始する
 * フェーズ進行はマニュアル制御
 */

import { prisma } from './prisma'
import { CotSessionStatus, CotPhaseStep } from '@prisma/client'

export interface TriggerConfig {
  autoProgressSteps: boolean  // ステップ内の自動進行（THINK→EXECUTE→INTEGRATE）
  autoProgressPhases: boolean // フェーズ間の自動進行（Phase1→Phase2→...）
  maxRetries: number
  retryDelay: number
}

// デフォルト設定：ステップ内は自動、フェーズ間は手動
export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  autoProgressSteps: true,   // APIレスポンス受信後、次のステップへ自動進行
  autoProgressPhases: false, // フェーズ完了後は手動で次フェーズへ
  maxRetries: 3,
  retryDelay: 1000
}

export class AsyncTriggerSystem {
  constructor(private config: TriggerConfig = DEFAULT_TRIGGER_CONFIG) {}

  /**
   * APIレスポンスを受け取った後の処理
   */
  async handleApiResponse(
    sessionId: string,
    phase: number,
    step: CotPhaseStep,
    response: any
  ): Promise<void> {
    console.log(`[TRIGGER] Received response for session ${sessionId}, phase ${phase}, step ${step}`)

    // レスポンスをDBに保存
    await this.saveResponse(sessionId, phase, step, response)

    // ステップ内の自動進行が有効な場合
    if (this.config.autoProgressSteps) {
      const nextStep = this.getNextStep(step)
      
      if (nextStep) {
        // 同一フェーズ内の次のステップへ自動進行
        console.log(`[TRIGGER] Auto-progressing to next step: ${nextStep}`)
        await this.triggerNextStep(sessionId, phase, nextStep)
      } else if (step === 'INTEGRATE') {
        // INTEGRATEが完了した場合
        console.log(`[TRIGGER] Phase ${phase} completed`)
        
        if (this.config.autoProgressPhases && phase < 5) {
          // フェーズ間の自動進行が有効な場合（デフォルトは無効）
          console.log(`[TRIGGER] Auto-progressing to phase ${phase + 1}`)
          await this.triggerNextPhase(sessionId, phase + 1)
        } else {
          // フェーズ完了を通知（UI側で確認できるように）
          await this.notifyPhaseCompletion(sessionId, phase)
        }
      }
    }
  }

  /**
   * エラー発生時の処理
   */
  async handleError(
    sessionId: string,
    phase: number,
    step: CotPhaseStep,
    error: Error
  ): Promise<void> {
    console.error(`[TRIGGER] Error in session ${sessionId}, phase ${phase}, step ${step}:`, error)

    // エラー情報を保存
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        lastError: error.message,
        status: 'FAILED',
        updatedAt: new Date()
      }
    })

    // リトライ可能かチェック
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })

    if (session && session.retryCount < this.config.maxRetries) {
      console.log(`[TRIGGER] Scheduling retry ${session.retryCount + 1}/${this.config.maxRetries}`)
      
      // リトライをスケジュール
      setTimeout(() => {
        this.retryFromLastSuccessfulPoint(sessionId).catch(console.error)
      }, this.config.retryDelay * (session.retryCount + 1))
    }
  }

  /**
   * 最後に成功した地点から再開
   */
  async retryFromLastSuccessfulPoint(sessionId: string): Promise<void> {
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

    // リトライカウントを増やす
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        retryCount: session.retryCount + 1,
        status: 'PENDING',
        lastError: null
      }
    })

    // 最後に成功したフェーズとステップを特定
    let resumePhase = session.currentPhase
    let resumeStep: CotPhaseStep = 'THINK'

    for (const phase of session.phases) {
      if (phase.integrateResult) {
        // このフェーズは完了している
        continue
      } else if (phase.executeResult) {
        // EXECUTEまで完了
        resumePhase = phase.phase
        resumeStep = 'INTEGRATE'
        break
      } else if (phase.thinkResult) {
        // THINKまで完了
        resumePhase = phase.phase
        resumeStep = 'EXECUTE'
        break
      } else {
        // このフェーズから開始
        resumePhase = phase.phase
        resumeStep = 'THINK'
        break
      }
    }

    console.log(`[TRIGGER] Resuming from phase ${resumePhase}, step ${resumeStep}`)
    
    // 再開をトリガー
    await this.triggerStep(sessionId, resumePhase, resumeStep)
  }

  /**
   * 手動でフェーズを進める
   */
  async manualProgressToNextPhase(sessionId: string): Promise<void> {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      throw new Error('Session not found')
    }

    const nextPhase = session.currentPhase + 1
    if (nextPhase > 5) {
      throw new Error('All phases completed')
    }

    console.log(`[TRIGGER] Manual progression to phase ${nextPhase}`)
    await this.triggerNextPhase(sessionId, nextPhase)
  }

  /**
   * 次のステップを取得
   */
  private getNextStep(currentStep: CotPhaseStep): CotPhaseStep | null {
    const stepOrder: Record<CotPhaseStep, CotPhaseStep | null> = {
      'THINK': 'EXECUTE',
      'EXECUTE': 'INTEGRATE',
      'INTEGRATE': null
    }
    return stepOrder[currentStep]
  }

  /**
   * レスポンスを保存
   */
  private async saveResponse(
    sessionId: string,
    phase: number,
    step: CotPhaseStep,
    response: any
  ): Promise<void> {
    const columnMap = {
      THINK: 'thinkResult',
      EXECUTE: 'executeResult',
      INTEGRATE: 'integrateResult'
    }

    const column = columnMap[step]
    
    await prisma.cotPhase.upsert({
      where: {
        sessionId_phase: { sessionId, phase }
      },
      update: {
        [column]: response,
        updatedAt: new Date()
      },
      create: {
        sessionId,
        phase,
        [column]: response
      }
    })

    // セッションの状態を更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentStep: step,
        status: this.getStatusForStep(step),
        updatedAt: new Date()
      }
    })
  }

  /**
   * ステップに対応するステータスを取得
   */
  private getStatusForStep(step: CotPhaseStep): CotSessionStatus {
    const statusMap: Record<CotPhaseStep, CotSessionStatus> = {
      'THINK': 'THINKING',
      'EXECUTE': 'EXECUTING',
      'INTEGRATE': 'INTEGRATING'
    }
    return statusMap[step]
  }

  /**
   * 次のステップをトリガー
   */
  private async triggerNextStep(
    sessionId: string,
    phase: number,
    step: CotPhaseStep
  ): Promise<void> {
    await this.triggerStep(sessionId, phase, step)
  }

  /**
   * 次のフェーズをトリガー
   */
  private async triggerNextPhase(
    sessionId: string,
    phase: number
  ): Promise<void> {
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentPhase: phase,
        currentStep: 'THINK',
        status: 'THINKING'
      }
    })

    await this.triggerStep(sessionId, phase, 'THINK')
  }

  /**
   * 特定のステップをトリガー
   */
  private async triggerStep(
    sessionId: string,
    phase: number,
    step: CotPhaseStep
  ): Promise<void> {
    const endpoint = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/viral/cot-session/${sessionId}/process-async`
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phase,
          step,
          autoTrigger: true
        })
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }
    } catch (error) {
      console.error(`[TRIGGER] Failed to trigger step:`, error)
      // エラーは上位で処理
      throw error
    }
  }

  /**
   * フェーズ完了を通知
   */
  private async notifyPhaseCompletion(
    sessionId: string,
    phase: number
  ): Promise<void> {
    console.log(`[TRIGGER] Phase ${phase} completed for session ${sessionId}`)
    
    // ここでWebSocketやServer-Sent Eventsを使って
    // UIに完了を通知することも可能
    
    // 現在はログのみ
  }
}

// シングルトンインスタンス
export const asyncTriggerSystem = new AsyncTriggerSystem()