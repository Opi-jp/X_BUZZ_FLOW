#!/usr/bin/env node

/**
 * Claude専用 即座エラー感知システム
 * 
 * あらゆるエラーを瞬時に検出し、Claudeが理解しやすい形式で表示
 * - リアルタイムログ監視
 * - API/DB/フロントエンドエラー検出
 * - 即座の原因分析
 * - 解決提案
 */

const { exec, spawn } = require('child_process')
const fs = require('fs')
const axios = require('axios')
const WebSocket = require('ws')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  blink: '\x1b[5m'
}

class ClaudeInstantErrorDetector {
  constructor() {
    this.errorCount = 0
    this.lastErrors = []
    this.monitoringActive = false
    this.watchers = []
    this.errorPatterns = {
      // API エラーパターン
      api: [
        /Error: .*POST \/api\/.*/,
        /Error: .*GET \/api\/.*/,
        /500 Internal Server Error/,
        /TypeError: Cannot read propert/,
        /ReferenceError:/,
        /SyntaxError:/
      ],
      // データベースエラーパターン
      database: [
        /Can't reach database server/,
        /Prisma.*Error/,
        /Column .* does not exist/,
        /relation .* does not exist/,
        /connection terminated/
      ],
      // フロントエンドエラーパターン
      frontend: [
        /Unhandled Runtime Error/,
        /ChunkLoadError/,
        /Module not found/,
        /Hydration failed/,
        /React.*Error/
      ],
      // Next.js エラーパターン
      nextjs: [
        /Error: ENOENT.*\.next/,
        /Failed to compile/,
        /Module build failed/,
        /TypeError.*undefined/
      ]
    }
    
    this.criticalKeywords = [
      'Error', 'error', 'ERROR',
      'Failed', 'failed', 'FAILED',
      'Exception', 'exception',
      'Cannot', 'Undefined', 'TypeError',
      '500', '404', '401', '403',
      'timeout', 'TIMEOUT'
    ]
  }

  start() {
    console.log(`${colors.bold}${colors.red}`)
    console.log('🚨 CLAUDE 即座エラー感知システム 🚨')
    console.log('=' .repeat(50))
    console.log(`${colors.reset}`)
    console.log(`${colors.green}✅ 監視開始: ${new Date().toLocaleTimeString()}${colors.reset}`)
    console.log(`${colors.cyan}📡 すべてのエラーを即座に検出します${colors.reset}`)
    console.log()
    
    this.monitoringActive = true
    
    // 複数の監視を並行実行
    this.startTmuxLogMonitoring()
    this.startFileSystemMonitoring()
    this.startAPIHealthMonitoring()
    this.startDatabaseMonitoring()
    this.startErrorFileMonitoring()
    
    // 定期的な総合チェック
    setInterval(() => {
      this.performHealthCheck()
    }, 10000) // 10秒ごと
    
    // 終了処理
    process.on('SIGINT', () => {
      this.stop()
    })
  }

  stop() {
    console.log(`\n${colors.yellow}🛑 エラー監視を停止中...${colors.reset}`)
    this.monitoringActive = false
    
    // ウォッチャーを停止
    this.watchers.forEach(watcher => {
      if (watcher.kill) watcher.kill()
      if (watcher.close) watcher.close()
    })
    
    console.log(`${colors.green}👋 Claude エラー検出システムを終了しました${colors.reset}`)
    process.exit(0)
  }

  // tmuxログのリアルタイム監視
  startTmuxLogMonitoring() {
    console.log(`${colors.blue}🔍 tmuxログ監視開始${colors.reset}`)
    
    const tmuxWatcher = spawn('tmux', ['capture-pane', '-t', 'xbuzz:next', '-p'])
    
    // 定期的にtmuxからログを取得
    const tmuxInterval = setInterval(() => {
      if (!this.monitoringActive) {
        clearInterval(tmuxInterval)
        return
      }
      
      exec('tmux capture-pane -t xbuzz:next -p', (error, stdout) => {
        if (error) return
        
        const lines = stdout.split('\n').slice(-10) // 最新10行
        this.analyzeLogLines(lines, 'tmux')
      })
    }, 2000) // 2秒ごと
    
    this.watchers.push({ kill: () => clearInterval(tmuxInterval) })
  }

  // ファイルシステム監視（.nextフォルダなど）
  startFileSystemMonitoring() {
    console.log(`${colors.blue}📁 ファイルシステム監視開始${colors.reset}`)
    
    try {
      // .nextフォルダのエラーログを監視
      const nextErrorLog = '.next/server/traces'
      if (fs.existsSync(nextErrorLog)) {
        const fsWatcher = fs.watch(nextErrorLog, (eventType, filename) => {
          if (filename && filename.includes('error')) {
            this.reportError('filesystem', `Next.js error detected: ${filename}`)
          }
        })
        this.watchers.push(fsWatcher)
      }
      
      // package.jsonの変更監視
      const packageWatcher = fs.watch('package.json', () => {
        this.reportWarning('dependency', 'package.json changed - dependencies may need update')
      })
      this.watchers.push(packageWatcher)
      
    } catch (error) {
      this.reportError('monitoring', `Failed to start filesystem monitoring: ${error.message}`)
    }
  }

  // API健全性監視
  startAPIHealthMonitoring() {
    console.log(`${colors.blue}🌐 API健全性監視開始${colors.reset}`)
    
    const healthCheck = async () => {
      if (!this.monitoringActive) return
      
      try {
        const response = await axios.get('http://localhost:3000/api/health', { timeout: 5000 })
        
        if (response.status !== 200) {
          this.reportError('api', `Health check failed: status ${response.status}`)
        }
        
        if (response.data?.database !== 'connected') {
          this.reportError('database', 'Database connection lost')
        }
        
      } catch (error) {
        this.reportError('api', `Health check failed: ${error.message}`)
      }
    }
    
    // 5秒ごとにヘルスチェック
    const healthInterval = setInterval(healthCheck, 5000)
    this.watchers.push({ kill: () => clearInterval(healthInterval) })
    
    // 初回実行
    healthCheck()
  }

  // データベース監視
  startDatabaseMonitoring() {
    console.log(`${colors.blue}🗄️ データベース監視開始${colors.reset}`)
    
    const dbCheck = async () => {
      if (!this.monitoringActive) return
      
      try {
        await new Promise((resolve, reject) => {
          exec('node scripts/dev-tools/db-schema-validator.js', { timeout: 10000 }, (error, stdout) => {
            if (error) {
              this.reportError('database', `DB validation failed: ${error.message}`)
            } else if (stdout.includes('Failed') || stdout.includes('Error')) {
              this.reportError('database', 'Database schema validation issues detected')
            }
            resolve()
          })
        })
      } catch (error) {
        this.reportError('database', `DB monitoring error: ${error.message}`)
      }
    }
    
    // 30秒ごとにDBチェック
    const dbInterval = setInterval(dbCheck, 30000)
    this.watchers.push({ kill: () => clearInterval(dbInterval) })
  }

  // ERRORS.mdファイル監視
  startErrorFileMonitoring() {
    console.log(`${colors.blue}📝 ERRORS.md監視開始${colors.reset}`)
    
    try {
      const errorFileWatcher = fs.watch('ERRORS.md', (eventType) => {
        if (eventType === 'change') {
          this.reportWarning('documentation', 'New error documented in ERRORS.md')
        }
      })
      this.watchers.push(errorFileWatcher)
    } catch (error) {
      console.log(`${colors.yellow}⚠️ ERRORS.md監視に失敗: ${error.message}${colors.reset}`)
    }
  }

  // ログ行の分析
  analyzeLogLines(lines, source) {
    for (const line of lines) {
      if (!line.trim()) continue
      
      // クリティカルキーワードチェック
      const hasCriticalKeyword = this.criticalKeywords.some(keyword => 
        line.includes(keyword)
      )
      
      if (hasCriticalKeyword) {
        // パターンマッチング
        const errorType = this.classifyError(line)
        if (errorType) {
          this.reportError(errorType, line, source)
        }
      }
      
      // CLAUDE_LOGからのエラー検出
      if (line.includes('CLAUDE_LOG:')) {
        try {
          const logMatch = line.match(/CLAUDE_LOG: (.+)/)
          if (logMatch) {
            const logData = JSON.parse(logMatch[1])
            if (logData.level === 'ERROR') {
              this.reportError('claude-log', logData.message, 'claude-logger')
            }
          }
        } catch (e) {
          // JSON parse error - ignore
        }
      }
    }
  }

  // エラー分類
  classifyError(line) {
    for (const [type, patterns] of Object.entries(this.errorPatterns)) {
      if (patterns.some(pattern => pattern.test(line))) {
        return type
      }
    }
    
    // 一般的なエラーキーワード
    if (line.includes('Error') || line.includes('Failed') || line.includes('500')) {
      return 'general'
    }
    
    return null
  }

  // エラー報告
  reportError(type, message, source = 'unknown') {
    this.errorCount++
    const timestamp = new Date().toLocaleTimeString()
    
    const error = {
      id: this.errorCount,
      type,
      message,
      source,
      timestamp,
      severity: this.calculateSeverity(type, message)
    }
    
    this.lastErrors.unshift(error)
    this.lastErrors = this.lastErrors.slice(0, 10) // 最新10件のみ保持
    
    // 即座に表示
    this.displayError(error)
    
    // ERRORS.mdに自動記録（重要なエラーのみ）
    if (error.severity === 'critical' || error.severity === 'high') {
      this.autoRecordError(error)
    }
  }

  // 警告報告
  reportWarning(type, message) {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`${colors.yellow}⚠️ [${timestamp}] ${type.toUpperCase()}: ${message}${colors.reset}`)
  }

  // エラー表示
  displayError(error) {
    const severityColors = {
      critical: colors.red + colors.blink,
      high: colors.red,
      medium: colors.yellow,
      low: colors.blue
    }
    
    const color = severityColors[error.severity] || colors.cyan
    
    console.log(`${color}${colors.bold}`)
    console.log('🚨 ERROR DETECTED 🚨')
    console.log('=' .repeat(50))
    console.log(`ID: #${error.id}`)
    console.log(`Time: ${error.timestamp}`)
    console.log(`Type: ${error.type.toUpperCase()}`)
    console.log(`Source: ${error.source}`)
    console.log(`Severity: ${error.severity.toUpperCase()}`)
    console.log(`Message: ${error.message}`)
    
    // 解決提案
    const suggestion = this.getSuggestion(error.type, error.message)
    if (suggestion) {
      console.log(`${colors.green}💡 Suggestion: ${suggestion}${colors.reset}`)
    }
    
    console.log('=' .repeat(50))
    console.log(`${colors.reset}`)
    console.log()
  }

  // 重要度計算
  calculateSeverity(type, message) {
    // Critical: サーバーダウン、DB接続失敗
    if (type === 'database' && message.includes('Can\'t reach database')) return 'critical'
    if (message.includes('500') && type === 'api') return 'critical'
    if (message.includes('ECONNREFUSED')) return 'critical'
    
    // High: API エラー、重要な機能の失敗
    if (type === 'api' || type === 'database') return 'high'
    if (message.includes('TypeError') || message.includes('ReferenceError')) return 'high'
    
    // Medium: フロントエンドエラー、コンパイルエラー
    if (type === 'frontend' || type === 'nextjs') return 'medium'
    
    // Low: その他
    return 'low'
  }

  // 解決提案
  getSuggestion(type, message) {
    const suggestions = {
      database: {
        'Can\'t reach database': 'Check DATABASE_URL in .env.local and verify DB is running',
        'Column.*does not exist': 'Run: npx prisma migrate dev or npx prisma db push',
        'Prisma.*Error': 'Check prisma/schema.prisma and run: npx prisma generate'
      },
      api: {
        '500': 'Check server logs and verify API endpoint implementation',
        'TypeError': 'Check variable types and null/undefined handling',
        'timeout': 'Increase timeout or check network connectivity'
      },
      frontend: {
        'ChunkLoadError': 'Clear browser cache and restart dev server',
        'Hydration failed': 'Check SSR vs client-side rendering differences',
        'Module not found': 'Check import paths and run: npm install'
      }
    }
    
    if (suggestions[type]) {
      for (const [pattern, suggestion] of Object.entries(suggestions[type])) {
        if (message.includes(pattern) || new RegExp(pattern).test(message)) {
          return suggestion
        }
      }
    }
    
    return null
  }

  // ERRORS.mdに自動記録
  autoRecordError(error) {
    try {
      exec(`node scripts/dev-tools/error-recorder.js --quick "${error.type} ${error.severity}" "${error.message}"`, 
        (recordError) => {
          if (recordError) {
            console.log(`${colors.yellow}⚠️ Failed to auto-record error: ${recordError.message}${colors.reset}`)
          }
        }
      )
    } catch (e) {
      // Ignore auto-record failures
    }
  }

  // 定期健全性チェック
  async performHealthCheck() {
    const issues = []
    
    // Recent error rate
    const recentErrors = this.lastErrors.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 60000 // 過去1分
    )
    
    if (recentErrors.length > 5) {
      issues.push(`High error rate: ${recentErrors.length} errors in last minute`)
    }
    
    // Server responsiveness
    try {
      const start = Date.now()
      await axios.get('http://localhost:3000/api/health', { timeout: 3000 })
      const responseTime = Date.now() - start
      
      if (responseTime > 2000) {
        issues.push(`Slow server response: ${responseTime}ms`)
      }
    } catch (error) {
      issues.push(`Server unresponsive: ${error.message}`)
    }
    
    // Report issues
    if (issues.length > 0) {
      console.log(`${colors.red}🚨 HEALTH CHECK ISSUES:${colors.reset}`)
      issues.forEach(issue => {
        console.log(`   ${colors.yellow}⚠️ ${issue}${colors.reset}`)
      })
      console.log()
    }
  }
}

// メイン実行
if (require.main === module) {
  const detector = new ClaudeInstantErrorDetector()
  detector.start()
}

module.exports = ClaudeInstantErrorDetector