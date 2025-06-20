#!/usr/bin/env node

/**
 * 統合監視ダッシュボード
 * 
 * 一般的な監視ツール、リンク切れチェック、パフォーマンス監視などを統合
 */

const { exec, spawn } = require('child_process')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
}

class UnifiedMonitoringDashboard {
  constructor() {
    this.baseUrl = 'http://localhost:3000'
    this.monitoringData = {
      serverHealth: null,
      databaseStatus: null,
      linkCheck: null,
      performanceMetrics: null,
      errorCount: 0,
      uptime: null,
      lastCheck: null,
      build: {
        lastBuildTime: null,
        lastBuildSuccess: null,
        lastBuildDuration: null,
        errors: [],
        warnings: [],
        consecutiveFailures: 0
      }
    }
    
    this.criticalPages = [
      '/create',
      '/create/flow',
      '/drafts',
      '/mission-control',
      '/api/health',
      '/api/flow'
    ]
    
    this.criticalApis = [
      '/api/health',
      '/api/flow',
      '/api/drafts',
      '/api/generation/content/sessions'
    ]
  }

  async checkServerHealth() {
    try {
      const start = Date.now()
      const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 })
      const responseTime = Date.now() - start
      
      this.monitoringData.serverHealth = {
        status: 'healthy',
        responseTime,
        data: response.data
      }
    } catch (error) {
      this.monitoringData.serverHealth = {
        status: 'unhealthy',
        error: error.message
      }
    }
  }

  async checkDatabaseStatus() {
    try {
      const result = await this.execCommand('node scripts/dev-tools/db-schema-validator.js')
      const isHealthy = !result.includes('Failed') && !result.includes('Error')
      
      this.monitoringData.databaseStatus = {
        status: isHealthy ? 'healthy' : 'issues',
        details: result.split('\n').slice(-5).join('\n')
      }
    } catch (error) {
      this.monitoringData.databaseStatus = {
        status: 'error',
        error: error.message
      }
    }
  }

  async checkCriticalPages() {
    const results = []
    
    for (const page of this.criticalPages) {
      try {
        const start = Date.now()
        const response = await axios.get(`${this.baseUrl}${page}`, { 
          timeout: 10000,
          validateStatus: (status) => status < 500 // 404 is ok, 500 is not
        })
        const responseTime = Date.now() - start
        
        results.push({
          page,
          status: response.status,
          responseTime,
          healthy: response.status < 400
        })
      } catch (error) {
        results.push({
          page,
          status: 'error',
          error: error.message,
          healthy: false
        })
      }
    }
    
    this.monitoringData.linkCheck = results
  }

  async checkApiEndpoints() {
    const results = []
    
    for (const api of this.criticalApis) {
      try {
        const start = Date.now()
        const response = await axios.get(`${this.baseUrl}${api}`, { 
          timeout: 5000,
          validateStatus: (status) => status < 500
        })
        const responseTime = Date.now() - start
        
        results.push({
          api,
          status: response.status,
          responseTime,
          healthy: response.status < 400
        })
      } catch (error) {
        results.push({
          api,
          status: 'error',
          error: error.message,
          healthy: false
        })
      }
    }
    
    return results
  }

  async checkPerformanceMetrics() {
    try {
      // メモリ使用量
      const memoryInfo = process.memoryUsage()
      
      // CPU使用率（簡易版）
      const cpuUsage = process.cpuUsage()
      
      // ディスク使用量
      const diskUsage = await this.execCommand('df -h . | tail -1')
      
      this.monitoringData.performanceMetrics = {
        memory: {
          used: Math.round(memoryInfo.heapUsed / 1024 / 1024),
          total: Math.round(memoryInfo.heapTotal / 1024 / 1024)
        },
        cpu: cpuUsage,
        disk: diskUsage.trim()
      }
    } catch (error) {
      this.monitoringData.performanceMetrics = {
        error: error.message
      }
    }
  }

  async checkErrorLogs() {
    try {
      // ERRORS.mdから最新のエラー数を取得
      const errorsContent = fs.readFileSync('ERRORS.md', 'utf8')
      const errorSections = errorsContent.split('## 🔴').length - 1
      
      this.monitoringData.errorCount = errorSections
    } catch (error) {
      this.monitoringData.errorCount = 'unknown'
    }
  }

  async checkBuildStatus() {
    try {
      const buildStatusPath = path.join(process.cwd(), '.build-status.json')
      if (fs.existsSync(buildStatusPath)) {
        const buildStatus = JSON.parse(fs.readFileSync(buildStatusPath, 'utf-8'))
        this.monitoringData.build = buildStatus
      }
    } catch (error) {
      console.error('ビルド状態チェックエラー:', error)
    }
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve(stdout)
        }
      })
    })
  }

  async runFullCheck() {
    console.log(`${colors.blue}🔍 統合監視チェック実行中...${colors.reset}`)
    
    this.monitoringData.lastCheck = new Date()
    
    await Promise.all([
      this.checkServerHealth(),
      this.checkDatabaseStatus(),
      this.checkCriticalPages(),
      this.checkPerformanceMetrics(),
      this.checkErrorLogs(),
      this.checkBuildStatus()
    ])
  }

  displayDashboard() {
    console.clear()
    
    // ヘッダー
    console.log(`${colors.bold}${colors.cyan}`)
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║                統合監視ダッシュボード                        ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log(`${colors.reset}`)
    
    const lastCheck = this.monitoringData.lastCheck
    if (lastCheck) {
      console.log(`${colors.dim}Last Check: ${lastCheck.toLocaleTimeString()}${colors.reset}`)
    }
    console.log()
    
    // サーバーヘルス
    this.displayServerHealth()
    
    // データベース状態
    this.displayDatabaseStatus()
    
    // ページ/APIチェック
    this.displayPageStatus()
    
    // パフォーマンス
    this.displayPerformanceMetrics()
    
    // エラー統計
    this.displayErrorStats()
    
    // ビルド状態
    this.displayBuildStatus()
    
    console.log(`${colors.cyan}${'─'.repeat(70)}${colors.reset}`)
    console.log(`${colors.dim}Press Ctrl+C to stop monitoring${colors.reset}`)
  }

  displayServerHealth() {
    const health = this.monitoringData.serverHealth
    
    if (!health) {
      console.log(`${colors.yellow}🔄 Server Health: Checking...${colors.reset}`)
      return
    }
    
    if (health.status === 'healthy') {
      console.log(`${colors.green}✅ Server Health: Healthy (${health.responseTime}ms)${colors.reset}`)
      if (health.data?.database === 'connected') {
        console.log(`   ${colors.green}└─ Database: Connected${colors.reset}`)
      }
    } else {
      console.log(`${colors.red}❌ Server Health: ${health.error}${colors.reset}`)
    }
    console.log()
  }

  displayDatabaseStatus() {
    const db = this.monitoringData.databaseStatus
    
    if (!db) {
      console.log(`${colors.yellow}🔄 Database: Checking...${colors.reset}`)
      return
    }
    
    if (db.status === 'healthy') {
      console.log(`${colors.green}✅ Database: Healthy${colors.reset}`)
    } else if (db.status === 'issues') {
      console.log(`${colors.yellow}⚠️ Database: Issues detected${colors.reset}`)
    } else {
      console.log(`${colors.red}❌ Database: ${db.error}${colors.reset}`)
    }
    console.log()
  }

  displayPageStatus() {
    const links = this.monitoringData.linkCheck
    
    if (!links) {
      console.log(`${colors.yellow}🔄 Pages: Checking...${colors.reset}`)
      return
    }
    
    const healthyPages = links.filter(l => l.healthy).length
    const totalPages = links.length
    
    if (healthyPages === totalPages) {
      console.log(`${colors.green}✅ Pages: All ${totalPages} pages healthy${colors.reset}`)
    } else {
      console.log(`${colors.yellow}⚠️ Pages: ${healthyPages}/${totalPages} healthy${colors.reset}`)
      
      // 問題のあるページを表示
      const problematicPages = links.filter(l => !l.healthy)
      for (const page of problematicPages.slice(0, 3)) {
        console.log(`   ${colors.red}└─ ${page.page}: ${page.status}${colors.reset}`)
      }
    }
    console.log()
  }

  displayPerformanceMetrics() {
    const perf = this.monitoringData.performanceMetrics
    
    if (!perf) {
      console.log(`${colors.yellow}🔄 Performance: Checking...${colors.reset}`)
      return
    }
    
    if (perf.error) {
      console.log(`${colors.red}❌ Performance: ${perf.error}${colors.reset}`)
      return
    }
    
    console.log(`${colors.blue}📊 Performance:${colors.reset}`)
    if (perf.memory) {
      const memoryUsage = ((perf.memory.used / perf.memory.total) * 100).toFixed(1)
      const memoryColor = memoryUsage > 80 ? colors.red : memoryUsage > 60 ? colors.yellow : colors.green
      console.log(`   Memory: ${memoryColor}${perf.memory.used}MB / ${perf.memory.total}MB (${memoryUsage}%)${colors.reset}`)
    }
    if (perf.disk) {
      console.log(`   Disk: ${colors.cyan}${perf.disk}${colors.reset}`)
    }
    console.log()
  }

  displayErrorStats() {
    const errorCount = this.monitoringData.errorCount
    
    if (errorCount === 'unknown') {
      console.log(`${colors.yellow}🔄 Errors: Unknown${colors.reset}`)
    } else if (errorCount === 0) {
      console.log(`${colors.green}✅ Errors: No errors in ERRORS.md${colors.reset}`)
    } else {
      const errorColor = errorCount > 10 ? colors.red : errorCount > 5 ? colors.yellow : colors.cyan
      console.log(`${errorColor}📝 Errors: ${errorCount} documented errors in ERRORS.md${colors.reset}`)
    }
    console.log()
  }

  displayBuildStatus() {
    console.log(`${colors.bold}${colors.purple}🔨 Build Status${colors.reset}`)
    
    const build = this.monitoringData.build
    if (!build || !build.lastBuildTime) {
      console.log(`${colors.dim}   No build information available${colors.reset}`)
    } else {
      const statusColor = build.lastBuildSuccess ? colors.green : colors.red
      const statusIcon = build.lastBuildSuccess ? '✅' : '❌'
      const lastBuildTime = new Date(build.lastBuildTime)
      const timeStr = lastBuildTime.toLocaleTimeString()
      
      console.log(`   Last Build: ${timeStr}`)
      console.log(`   Status: ${statusColor}${statusIcon} ${build.lastBuildSuccess ? 'Success' : 'Failed'}${colors.reset}`)
      
      if (build.lastBuildDuration) {
        console.log(`   Duration: ${(build.lastBuildDuration / 1000).toFixed(1)}s`)
      }
      
      if (build.errors && build.errors.length > 0) {
        console.log(`   ${colors.red}Errors: ${build.errors.length}${colors.reset}`)
      }
      
      if (build.warnings && build.warnings.length > 0) {
        console.log(`   ${colors.yellow}Warnings: ${build.warnings.length}${colors.reset}`)
      }
      
      if (build.consecutiveFailures > 0) {
        console.log(`   ${colors.red}Consecutive Failures: ${build.consecutiveFailures}${colors.reset}`)
      }
    }
    
    console.log()
  }

  async startMonitoring(interval = 30000) {
    console.log(`${colors.green}🚀 統合監視ダッシュボード開始${colors.reset}`)
    console.log(`${colors.cyan}📊 ${interval/1000}秒間隔で監視中...${colors.reset}`)
    console.log()
    
    // 初回チェック
    await this.runFullCheck()
    this.displayDashboard()
    
    // 定期チェック
    const monitoringInterval = setInterval(async () => {
      await this.runFullCheck()
      this.displayDashboard()
    }, interval)
    
    // Ctrl+C での終了
    process.on('SIGINT', () => {
      clearInterval(monitoringInterval)
      console.log(`\n${colors.green}👋 監視を停止しました${colors.reset}`)
      process.exit(0)
    })
  }
}

// コマンドライン実行
if (require.main === module) {
  const dashboard = new UnifiedMonitoringDashboard()
  
  const command = process.argv[2]
  const interval = parseInt(process.argv[3]) || 30000
  
  if (command === 'once') {
    // 1回だけチェック
    dashboard.runFullCheck().then(() => {
      dashboard.displayDashboard()
    })
  } else {
    // 継続監視
    dashboard.startMonitoring(interval)
  }
}

module.exports = UnifiedMonitoringDashboard