// フロー管理のヘルパー関数

import { 
  FlowSession, 
  FlowStep, 
  STEP_TO_API_PHASE,
  USER_INPUT_STEPS,
  AUTO_EXECUTE_STEPS,
  API_CALL_STEPS,
  RETRYABLE_STEPS
} from './types'
import { FLOW_STEPS } from '@/components/flow/StepIndicator'

export class FlowManager {
  private session: FlowSession

  constructor(session: FlowSession) {
    this.session = session
  }

  // 現在のステップを取得
  getCurrentStep(): FlowStep | undefined {
    return this.session.steps.find(step => step.status === 'current')
  }

  // 次のステップに進む
  async proceedToNextStep(data?: any): Promise<boolean> {
    const currentStep = this.getCurrentStep()
    if (!currentStep) return false

    // 現在のステップを完了
    currentStep.status = 'completed'
    currentStep.completedAt = new Date()
    if (data) currentStep.data = data

    // 次のステップを探す
    const nextStepId = currentStep.id + 1
    const nextStep = this.session.steps.find(step => step.id === nextStepId)
    
    if (!nextStep) {
      // 全ステップ完了
      this.session.status = 'completed'
      return true
    }

    // 次のステップをアクティブに
    nextStep.status = 'current'
    nextStep.startedAt = new Date()
    this.session.currentStep = nextStepId

    return true
  }

  // 前のステップに戻る
  goToPreviousStep(): boolean {
    const currentStep = this.getCurrentStep()
    if (!currentStep || currentStep.id === 1) return false

    // 現在のステップをリセット
    currentStep.status = 'pending'
    currentStep.startedAt = undefined
    currentStep.completedAt = undefined
    currentStep.error = undefined

    // 前のステップを探す
    const prevStepId = currentStep.id - 1
    const prevStep = this.session.steps.find(step => step.id === prevStepId)
    
    if (!prevStep) return false

    // 前のステップをアクティブに
    prevStep.status = 'current'
    prevStep.completedAt = undefined
    this.session.currentStep = prevStepId

    return true
  }

  // 特定のステップにジャンプ
  jumpToStep(stepId: number): boolean {
    const targetStep = this.session.steps.find(step => step.id === stepId)
    if (!targetStep) return false

    // 現在のステップを非アクティブに
    const currentStep = this.getCurrentStep()
    if (currentStep) {
      currentStep.status = 'pending'
    }

    // ターゲットステップをアクティブに
    targetStep.status = 'current'
    targetStep.startedAt = new Date()
    this.session.currentStep = stepId

    // それ以前のステップを完了済みに
    this.session.steps.forEach(step => {
      if (step.id < stepId) {
        step.status = 'completed'
      } else if (step.id > stepId) {
        step.status = 'pending'
        step.startedAt = undefined
        step.completedAt = undefined
        step.error = undefined
      }
    })

    return true
  }

  // ステップがユーザー入力を必要とするか
  requiresUserInput(stepId: number): boolean {
    return USER_INPUT_STEPS.includes(stepId)
  }

  // ステップが自動実行されるか
  isAutoExecute(stepId: number): boolean {
    return AUTO_EXECUTE_STEPS.includes(stepId)
  }

  // ステップがAPI呼び出しを必要とするか
  requiresAPICall(stepId: number): boolean {
    return API_CALL_STEPS.includes(stepId)
  }

  // ステップがリトライ可能か
  isRetryable(stepId: number): boolean {
    return RETRYABLE_STEPS.includes(stepId)
  }

  // エラーを設定
  setError(error: string): void {
    const currentStep = this.getCurrentStep()
    if (currentStep) {
      currentStep.status = 'error'
      currentStep.error = error
    }
    this.session.status = 'failed'
  }

  // セッションの進捗を計算（パーセンテージ）
  getProgress(): number {
    const completedSteps = this.session.steps.filter(
      step => step.status === 'completed'
    ).length
    return Math.round((completedSteps / this.session.steps.length) * 100)
  }

  // API用のフェーズ名を取得
  getAPIPhase(stepId: number): string | undefined {
    return STEP_TO_API_PHASE[stepId]
  }

  // セッションデータを取得
  getSession(): FlowSession {
    return this.session
  }

  // 完了したステップのデータを集約
  getCompletedData(): Record<string, any> {
    const data: Record<string, any> = {}
    this.session.steps
      .filter(step => step.status === 'completed' && step.data)
      .forEach(step => {
        const phase = this.getAPIPhase(step.id)
        if (phase) {
          data[phase] = step.data
        }
      })
    return data
  }
}

// 新しいフローセッションを作成
export function createFlowSession(
  theme: string,
  platform: string = 'Twitter',
  style: string = 'エンターテイメント',
  postFormat: 'single' | 'thread' = 'single'
): FlowSession {
  const steps: FlowStep[] = FLOW_STEPS.map(stepDef => ({
    ...stepDef,
    status: stepDef.id === 1 ? 'current' : 'pending'
  }))

  return {
    id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    theme,
    platform,
    style,
    postFormat,
    currentStep: 1,
    steps,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

// セッションをローカルストレージに保存
export function saveSessionToStorage(session: FlowSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`flow_session_${session.id}`, JSON.stringify(session))
  }
}

// セッションをローカルストレージから読み込み
export function loadSessionFromStorage(sessionId: string): FlowSession | null {
  if (typeof window === 'undefined') return null
  
  const data = localStorage.getItem(`flow_session_${sessionId}`)
  if (!data) return null
  
  try {
    const session = JSON.parse(data)
    // Date型の復元
    session.createdAt = new Date(session.createdAt)
    session.updatedAt = new Date(session.updatedAt)
    session.steps.forEach((step: FlowStep) => {
      if (step.startedAt) step.startedAt = new Date(step.startedAt)
      if (step.completedAt) step.completedAt = new Date(step.completedAt)
    })
    return session
  } catch (error) {
    console.error('Failed to parse session from storage:', error)
    return null
  }
}

// アクティブなセッション一覧を取得
export function getActiveSessionsFromStorage(): FlowSession[] {
  if (typeof window === 'undefined') return []
  
  const sessions: FlowSession[] = []
  const keys = Object.keys(localStorage).filter(key => key.startsWith('flow_session_'))
  
  keys.forEach(key => {
    const sessionId = key.replace('flow_session_', '')
    const session = loadSessionFromStorage(sessionId)
    if (session && session.status === 'active') {
      sessions.push(session)
    }
  })
  
  return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}