/**
 * フロントエンドセッション管理
 * セッション中断→再開時のコンテキスト復元
 */

import { FlowSession, UIState } from '@/types/frontend'

const SESSION_STORAGE_KEY = 'x_buzz_flow_session'
const UI_STATE_KEY = 'x_buzz_flow_ui_state'

export class FrontendSessionManager {
  
  /**
   * 現在のセッション状態をローカルストレージに保存
   */
  static saveSession(session: FlowSession, uiState: UIState): void {
    try {
      const sessionData = {
        session,
        uiState,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
      
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData))
      console.log('✅ Session saved to localStorage')
    } catch (error) {
      console.error('❌ Failed to save session:', error)
    }
  }
  
  /**
   * 保存されたセッション状態を復元
   */
  static restoreSession(): { session: FlowSession | null; uiState: UIState | null } {
    try {
      const savedData = localStorage.getItem(SESSION_STORAGE_KEY)
      
      if (!savedData) {
        return { session: null, uiState: null }
      }
      
      const parsedData = JSON.parse(savedData)
      const savedTime = new Date(parsedData.timestamp)
      const now = new Date()
      
      // 24時間以上古いセッションは無効
      if (now.getTime() - savedTime.getTime() > 24 * 60 * 60 * 1000) {
        console.log('⏰ Session expired, clearing localStorage')
        this.clearSession()
        return { session: null, uiState: null }
      }
      
      console.log('✅ Session restored from localStorage')
      return {
        session: parsedData.session,
        uiState: parsedData.uiState
      }
      
    } catch (error) {
      console.error('❌ Failed to restore session:', error)
      this.clearSession()
      return { session: null, uiState: null }
    }
  }
  
  /**
   * セッション状態をクリア
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      localStorage.removeItem(UI_STATE_KEY)
      console.log('🗑️ Session cleared from localStorage')
    } catch (error) {
      console.error('❌ Failed to clear session:', error)
    }
  }
  
  /**
   * 進行中のセッション一覧を取得
   */
  static async getActiveSessions(): Promise<FlowSession[]> {
    try {
      const response = await fetch('/api/flow/active')
      if (!response.ok) throw new Error('Failed to fetch active sessions')
      
      const data = await response.json()
      return data.sessions || []
    } catch (error) {
      console.error('❌ Failed to get active sessions:', error)
      return []
    }
  }
  
  /**
   * 最後に作業していたセッションを特定
   */
  static getLastActiveSessionId(): string | null {
    try {
      const savedData = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!savedData) return null
      
      const parsedData = JSON.parse(savedData)
      return parsedData.session?.id || null
    } catch (error) {
      console.error('❌ Failed to get last session ID:', error)
      return null
    }
  }
  
  /**
   * セッション復元のガイダンス表示
   */
  static getRestorationGuidance(): {
    canRestore: boolean
    message: string
    action?: string
  } {
    const restored = this.restoreSession()
    
    if (!restored.session) {
      return {
        canRestore: false,
        message: '新しいセッションを開始します'
      }
    }
    
    const session = restored.session
    const stepInfo = this.getStepGuidance(session.currentStep)
    
    return {
      canRestore: true,
      message: `前回のセッション（${session.theme}）を復元できます`,
      action: stepInfo.nextAction
    }
  }
  
  /**
   * ステップ別のガイダンス
   */
  private static getStepGuidance(step: string): { nextAction: string; description: string } {
    const guidance: Record<string, { nextAction: string; description: string }> = {
      'collecting_topics': {
        nextAction: 'トピック収集の完了を待つ',
        description: 'Perplexityが情報を収集中です'
      },
      'generating_concepts': {
        nextAction: 'コンセプト生成の完了を待つ',
        description: 'GPTがバイラルコンセプトを生成中です'
      },
      'awaiting_concept_selection': {
        nextAction: 'コンセプトを選択する',
        description: '生成されたコンセプトから最大3つ選択してください'
      },
      'awaiting_character_selection': {
        nextAction: 'キャラクターを選択する',
        description: '投稿のトーンを決めてください'
      },
      'generating_contents': {
        nextAction: '投稿生成の完了を待つ',
        description: 'Claudeが投稿文を生成中です'
      },
      'completed': {
        nextAction: '下書きを確認する',
        description: '生成完了！下書きをチェックして投稿しましょう'
      },
      'error': {
        nextAction: 'エラーを確認する',
        description: 'エラーが発生しています。詳細を確認してください'
      }
    }
    
    return guidance[step] || {
      nextAction: 'ステータスを確認する',
      description: '現在の状況を確認してください'
    }
  }
}