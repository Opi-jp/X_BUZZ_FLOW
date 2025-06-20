/**
 * Claude専用ログシステム
 * 
 * フロント・バックエンドの状況をClaude（AI）が把握しやすい形式でログ出力
 * - 構造化された情報
 * - フロー進行状況の可視化
 * - エラーの詳細情報
 * - パフォーマンス情報
 */

interface ClaudeLogContext {
  module: 'frontend' | 'backend' | 'api' | 'flow' | 'database' | 'external'
  operation: string
  sessionId?: string
  userId?: string
  metadata?: Record<string, any>
}

interface ClaudeLogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'FLOW'
  context: ClaudeLogContext
  message: string
  duration?: number
  data?: any
  error?: {
    type: string
    message: string
    stack?: string
    code?: string
  }
}

export class ClaudeLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development'
  
  /**
   * フロー進行ログ（最重要）
   */
  static flow(context: ClaudeLogContext, message: string, data?: any) {
    this.log('FLOW', context, message, data)
  }
  
  /**
   * 成功ログ
   */
  static success(context: ClaudeLogContext, message: string, duration?: number, data?: any) {
    this.log('SUCCESS', context, message, data, duration)
  }
  
  /**
   * 情報ログ
   */
  static info(context: ClaudeLogContext, message: string, data?: any) {
    this.log('INFO', context, message, data)
  }
  
  /**
   * 警告ログ
   */
  static warn(context: ClaudeLogContext, message: string, data?: any) {
    this.log('WARN', context, message, data)
  }
  
  /**
   * エラーログ
   */
  static error(context: ClaudeLogContext, message: string, error?: Error | any, data?: any) {
    const errorInfo = error ? {
      type: error.constructor?.name || 'Unknown',
      message: error.message || String(error),
      stack: error.stack,
      code: error.code || error.statusCode
    } : undefined
    
    this.log('ERROR', context, message, data, undefined, errorInfo)
  }
  
  /**
   * 統一ログ出力
   */
  private static log(
    level: ClaudeLogEntry['level'],
    context: ClaudeLogContext,
    message: string,
    data?: any,
    duration?: number,
    error?: ClaudeLogEntry['error']
  ) {
    const entry: ClaudeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(duration && { duration }),
      ...(data && { data }),
      ...(error && { error })
    }
    
    // 開発環境でのみコンソール出力
    if (this.isDevelopment) {
      this.formatConsoleOutput(entry)
    }
    
    // 本番環境でも構造化ログとして出力
    this.outputStructuredLog(entry)
  }
  
  /**
   * 開発環境用の見やすいコンソール出力
   */
  private static formatConsoleOutput(entry: ClaudeLogEntry) {
    const colors = {
      INFO: '\x1b[36m',    // cyan
      WARN: '\x1b[33m',    // yellow  
      ERROR: '\x1b[31m',   // red
      SUCCESS: '\x1b[32m', // green
      FLOW: '\x1b[35m',    // magenta
      reset: '\x1b[0m'
    }
    
    const color = colors[entry.level] || colors.INFO
    const time = entry.timestamp.split('T')[1].split('.')[0]
    
    // メインメッセージ
    console.log(
      `${color}[${entry.level}]${colors.reset} ` +
      `${time} ` +
      `[${entry.context.module.toUpperCase()}] ` +
      `${entry.message}`
    )
    
    // コンテキスト情報
    const contextInfo = []
    if (entry.context.sessionId) contextInfo.push(`session:${entry.context.sessionId}`)
    if (entry.context.operation) contextInfo.push(`op:${entry.context.operation}`)
    if (entry.duration) contextInfo.push(`${entry.duration}ms`)
    
    if (contextInfo.length > 0) {
      console.log(`  📍 ${contextInfo.join(' | ')}`)
    }
    
    // データ
    if (entry.data) {
      console.log(`  📊 Data:`, this.formatData(entry.data))
    }
    
    // エラー詳細
    if (entry.error) {
      console.log(`  ❌ ${entry.error.type}: ${entry.error.message}`)
      if (entry.error.code) {
        console.log(`  🔢 Code: ${entry.error.code}`)
      }
    }
    
    console.log() // 空行で区切り
  }
  
  /**
   * 本番用構造化ログ出力
   */
  private static outputStructuredLog(entry: ClaudeLogEntry) {
    // JSONとして出力（ログ収集システムが読み取りやすい）
    console.log(`CLAUDE_LOG: ${JSON.stringify(entry)}`)
  }
  
  /**
   * データのフォーマット
   */
  private static formatData(data: any): any {
    if (typeof data === 'string' && data.length > 200) {
      return data.substring(0, 200) + '...'
    }
    
    if (Array.isArray(data)) {
      return `Array(${data.length}) [${data.slice(0, 3).map(String).join(', ')}...]`
    }
    
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data)
      if (keys.length > 5) {
        const preview = keys.slice(0, 5).reduce((acc, key) => {
          acc[key] = data[key]
          return acc
        }, {} as any)
        return { ...preview, '...': `+${keys.length - 5} more` }
      }
    }
    
    return data
  }
  
  /**
   * Create フローの進行状況をログ
   */
  static logCreateFlow(sessionId: string, step: string, status: string, data?: any) {
    this.flow(
      {
        module: 'flow',
        operation: 'create-progress',
        sessionId
      },
      `📈 Create Flow: ${step} → ${status}`,
      data
    )
  }
  
  /**
   * API呼び出しの開始/終了をログ
   */
  static logApiCall(method: string, path: string, sessionId?: string) {
    return {
      start: () => {
        const startTime = Date.now()
        this.info(
          {
            module: 'api',
            operation: 'request',
            sessionId
          },
          `🌐 ${method} ${path}`,
          { startTime }
        )
        return startTime
      },
      end: (startTime: number, status: number, data?: any) => {
        const duration = Date.now() - startTime
        const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'SUCCESS'
        this.log(
          level,
          {
            module: 'api',
            operation: 'response',
            sessionId
          },
          `🌐 ${method} ${path} → ${status}`,
          data,
          duration
        )
      }
    }
  }
  
  /**
   * フロントエンドのアクションをログ
   */
  static logFrontendAction(action: string, component: string, data?: any) {
    this.info(
      {
        module: 'frontend',
        operation: action
      },
      `🖱️ [${component}] ${action}`,
      data
    )
  }
  
  /**
   * データベース操作をログ
   */
  static logDatabase(operation: string, table: string, duration?: number, data?: any) {
    this.info(
      {
        module: 'database',
        operation
      },
      `🗄️ ${operation} ${table}`,
      data
    )
  }
}

// 便利な短縮形
export const claudeLog = ClaudeLogger