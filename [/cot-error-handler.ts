// CoT専用のエラーハンドリングとリカバリー機能

import { prisma } from '@/lib/prisma'

export enum CotErrorType {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  TOKEN_LIMIT = 'TOKEN_LIMIT',
  PARSE_ERROR = 'PARSE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERPLEXITY_ERROR = 'PERPLEXITY_ERROR',
  DB_ERROR = 'DB_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface CotErrorInfo {
  type: CotErrorType
  userMessage: string
  technicalDetails: string
  statusCode: number
  retryable: boolean
  retryAfter?: number // seconds
  suggestedAction?: string
}

export class CotErrorHandler {
  // エラー分類とユーザー向けメッセージ生成
  static classifyError(error: any): CotErrorInfo {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    
    // Perplexity特有のエラー
    if (errorMessage.includes('Perplexity') || errorMessage.includes('pplx')) {
      if (errorMessage.includes('timeout')) {
        return {
          type: CotErrorType.PERPLEXITY_ERROR,
          userMessage: 'Perplexity APIの応答に時間がかかっています。検索クエリを簡略化して再試行します。',
          technicalDetails: errorMessage,
          statusCode: 504,
          retryable: true,
          retryAfter: 30,
          suggestedAction: 'SIMPLIFY_QUERY'
        }
      }
      return {
        type: CotErrorType.PERPLEXITY_ERROR,
        userMessage: 'Web検索でエラーが発生しました。別の検索方法を試みます。',
        technicalDetails: errorMessage,
        statusCode: 502,
        retryable: true,
        retryAfter: 10
      }
    }
    
    // タイムアウト
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      return {
        type: CotErrorType.TIMEOUT,
        userMessage: '処理に時間がかかりすぎました。処理を分割して再試行します。',
        technicalDetails: errorMessage,
        statusCode: 504,
        retryable: true,
        retryAfter: 60
      }
    }
    
    // レート制限
    if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      const waitTime = this.extractWaitTime(errorMessage) || 300
      return {
        type: CotErrorType.RATE_LIMIT,
        userMessage: `APIの利用制限に達しました。${Math.ceil(waitTime / 60)}分後に自動的に再試行されます。`,
        technicalDetails: errorMessage,
        statusCode: 429,
        retryable: true,
        retryAfter: waitTime
      }
    }
    
    // トークン制限
    if (errorMessage.includes('context length') || errorMessage.includes('token') || errorMessage.includes('maximum')) {
      return {
        type: CotErrorType.TOKEN_LIMIT,
        userMessage: '処理するデータが大きすぎます。内容を要約して再試行します。',
        technicalDetails: errorMessage,
        statusCode: 413,
        retryable: true,
        retryAfter: 5,
        suggestedAction: 'SUMMARIZE_CONTENT'
      }
    }
    
    // JSONパースエラー
    if (errorMessage.includes('JSON') || errorMessage.includes('parse') || errorMessage.includes('Unexpected')) {
      return {
        type: CotErrorType.PARSE_ERROR,
        userMessage: 'AIの応答形式にエラーがありました。再度生成を試みます。',
        technicalDetails: errorMessage,
        statusCode: 422,
        retryable: true,
        retryAfter: 5
      }
    }
    
    // ネットワークエラー
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
      return {
        type: CotErrorType.NETWORK_ERROR,
        userMessage: 'ネットワーク接続に問題があります。接続を確認して再試行します。',
        technicalDetails: errorMessage,
        statusCode: 503,
        retryable: true,
        retryAfter: 30
      }
    }
    
    // データベースエラー
    if (errorMessage.includes('prisma') || errorMessage.includes('database') || errorMessage.includes('P1')) {
      return {
        type: CotErrorType.DB_ERROR,
        userMessage: 'データの保存中にエラーが発生しました。再試行します。',
        technicalDetails: errorMessage,
        statusCode: 500,
        retryable: true,
        retryAfter: 10
      }
    }
    
    // その他のエラー
    return {
      type: CotErrorType.UNKNOWN,
      userMessage: '予期しないエラーが発生しました。しばらくお待ちください。',
      technicalDetails: errorMessage + '\n' + errorStack,
      statusCode: 500,
      retryable: true,
      retryAfter: 60
    }
  }
  
  // セッションエラー状態の記録
  static async recordSessionError(sessionId: string, errorInfo: CotErrorInfo) {
    try {
      const session = await prisma.cotSession.findUnique({
        where: { id: sessionId },
        select: { retryCount: true, errorHistory: true }
      })
      
      if (!session) return
      
      // エラー履歴の更新
      const errorHistory = (session.errorHistory as any[]) || []
      errorHistory.push({
        timestamp: new Date().toISOString(),
        type: errorInfo.type,
        message: errorInfo.userMessage,
        phase: session.currentPhase,
        step: session.currentStep,
        retryable: errorInfo.retryable
      })
      
      // 最新の5つのエラーのみ保持
      const recentErrors = errorHistory.slice(-5)
      
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'FAILED',
          lastError: `[${errorInfo.type}] ${errorInfo.userMessage}`,
          errorHistory: recentErrors,
          retryCount: { increment: 1 },
          nextRetryAt: errorInfo.retryAfter 
            ? new Date(Date.now() + errorInfo.retryAfter * 1000)
            : null
        }
      })
    } catch (dbError) {
      console.error('[ERROR HANDLER] Failed to record error:', dbError)
    }
  }
  
  // 自動復旧戦略の決定
  static async determineRecoveryStrategy(sessionId: string, errorInfo: CotErrorInfo): Promise<{
    action: 'RETRY' | 'RETRY_WITH_MODIFICATION' | 'SKIP_STEP' | 'ABORT'
    modification?: any
    waitTime?: number
  }> {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      select: { 
        retryCount: true, 
        currentPhase: true, 
        currentStep: true,
        errorHistory: true 
      }
    })
    
    if (!session) return { action: 'ABORT' }
    
    // 同じエラーが3回以上発生した場合
    const errorHistory = (session.errorHistory as any[]) || []
    const sameErrorCount = errorHistory.filter(e => e.type === errorInfo.type).length
    
    if (sameErrorCount >= 3) {
      // トークン制限の場合は内容を要約
      if (errorInfo.type === CotErrorType.TOKEN_LIMIT) {
        return {
          action: 'RETRY_WITH_MODIFICATION',
          modification: { summarize: true, maxTokens: 2000 }
        }
      }
      // その他のエラーはスキップ
      return { action: 'SKIP_STEP' }
    }
    
    // 全体の再試行回数が10回を超えた場合
    if (session.retryCount >= 10) {
      return { action: 'ABORT' }
    }
    
    // エラータイプに応じた戦略
    switch (errorInfo.type) {
      case CotErrorType.PERPLEXITY_ERROR:
        // 検索クエリを簡略化して再試行
        return {
          action: 'RETRY_WITH_MODIFICATION',
          modification: { simplifyQuery: true },
          waitTime: 10
        }
        
      case CotErrorType.RATE_LIMIT:
        // 指定された時間待機して再試行
        return {
          action: 'RETRY',
          waitTime: errorInfo.retryAfter || 300
        }
        
      case CotErrorType.TOKEN_LIMIT:
        // プロンプトを短縮して再試行
        return {
          action: 'RETRY_WITH_MODIFICATION',
          modification: { truncatePrompt: true, maxLength: 50000 }
        }
        
      case CotErrorType.PARSE_ERROR:
        // 即座に再試行（一時的なエラーの可能性）
        return {
          action: 'RETRY',
          waitTime: 5
        }
        
      default:
        // デフォルトは待機して再試行
        return {
          action: 'RETRY',
          waitTime: errorInfo.retryAfter || 60
        }
    }
  }
  
  // 待機時間の抽出
  private static extractWaitTime(errorMessage: string): number | null {
    // "Please try again in X seconds" パターン
    const secondsMatch = errorMessage.match(/(\d+)\s*seconds?/i)
    if (secondsMatch) {
      return parseInt(secondsMatch[1])
    }
    
    // "Please try again in X minutes" パターン
    const minutesMatch = errorMessage.match(/(\d+)\s*minutes?/i)
    if (minutesMatch) {
      return parseInt(minutesMatch[1]) * 60
    }
    
    return null
  }
  
  // セッションの健全性チェック
  static async checkSessionHealth(sessionId: string): Promise<{
    healthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: { phases: true }
    })
    
    if (!session) {
      return {
        healthy: false,
        issues: ['セッションが見つかりません'],
        recommendations: ['新しいセッションを作成してください']
      }
    }
    
    const issues: string[] = []
    const recommendations: string[] = []
    
    // エラー回数チェック
    if (session.retryCount >= 5) {
      issues.push(`エラー再試行回数が${session.retryCount}回に達しています`)
      recommendations.push('新しいセッションの作成を検討してください')
    }
    
    // 長時間スタック
    const lastUpdate = new Date(session.updatedAt).getTime()
    const stuckTime = Date.now() - lastUpdate
    if (stuckTime > 10 * 60 * 1000 && session.status !== 'COMPLETED') {
      issues.push(`${Math.round(stuckTime / 60000)}分間進捗がありません`)
      recommendations.push('セッションを再開するか、新規作成してください')
    }
    
    // フェーズの整合性チェック
    const completedPhases = session.phases.filter(p => p.status === 'COMPLETED').length
    if (completedPhases < session.currentPhase - 1) {
      issues.push('未完了のフェーズがあります')
      recommendations.push('セッションをリセットすることを推奨します')
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    }
  }
}