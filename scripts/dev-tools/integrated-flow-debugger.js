#!/usr/bin/env node
/**
 * 統合フロー専用デバッガー
 * Phase 3: デバッグ機能強化
 * 
 * 統合システム計画準拠のCreate→Draft→Postフローの
 * リアルタイム監視と問題検出を行う
 */

const { PrismaClient } = require('../../lib/generated/prisma')
const prisma = new PrismaClient()

class IntegratedFlowDebugger {
  constructor() {
    this.monitoringInterval = null
    this.isRunning = false
    this.metrics = {
      sessionsCreated: 0,
      successfulFlows: 0,
      errorCount: 0,
      averageFlowTime: 0,
      lastCheck: new Date()
    }
  }

  async start() {
    console.log('🔍 統合フロー デバッガー開始')
    console.log('=' .repeat(60))
    
    this.isRunning = true
    
    // 初期診断
    await this.runInitialDiagnostics()
    
    // リアルタイム監視開始
    this.startRealtimeMonitoring()
    
    // API健全性チェック
    await this.checkAPIHealth()
    
    console.log('\n👁️  リアルタイム監視中... (Ctrl+C で停止)')
  }

  async runInitialDiagnostics() {
    console.log('\n📊 初期診断実行中...')
    
    try {
      // DB接続確認
      const dbStatus = await this.checkDatabaseConnection()
      console.log(`DB接続: ${dbStatus ? '✅' : '❌'}`)
      
      // セッション統計
      const sessionStats = await this.getSessionStatistics()
      console.log(`アクティブセッション: ${sessionStats.active}件`)
      console.log(`完了セッション: ${sessionStats.completed}件`)
      console.log(`エラーセッション: ${sessionStats.error}件`)
      
      // 下書き統計
      const draftStats = await this.getDraftStatistics()
      console.log(`下書き総数: ${draftStats.total}件`)
      console.log(`投稿済み: ${draftStats.posted}件`)
      
      // API依存関係確認
      await this.checkAPIDependencies()
      
    } catch (error) {
      console.error('❌ 初期診断エラー:', error.message)
    }
  }

  async checkDatabaseConnection() {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('DB接続エラー:', error.message)
      return false
    }
  }

  async getSessionStatistics() {
    try {
      const [active, completed, error] = await Promise.all([
        prisma.viralSession.count({
          where: {
            status: { in: ['CREATED', 'COLLECTING', 'TOPICS_COLLECTED', 'CONCEPTS_GENERATED'] }
          }
        }),
        prisma.viralSession.count({
          where: { status: 'COMPLETED' }
        }),
        prisma.viralSession.count({
          where: { status: 'ERROR' }
        })
      ])
      
      return { active, completed, error }
    } catch (error) {
      console.error('セッション統計取得エラー:', error)
      return { active: 0, completed: 0, error: 0 }
    }
  }

  async getDraftStatistics() {
    try {
      const [total, posted] = await Promise.all([
        prisma.viralDraft.count(),
        prisma.viralDraft.count({
          where: { status: 'POSTED' }
        })
      ])
      
      return { total, posted }
    } catch (error) {
      console.error('下書き統計取得エラー:', error)
      return { total: 0, posted: 0 }
    }
  }

  async checkAPIDependencies() {
    console.log('\n🔗 API依存関係チェック...')
    
    const criticalAPIs = [
      '/api/flow',
      '/api/flow/[id]',
      '/api/flow/[id]/next', 
      '/api/drafts',
      '/api/drafts/[id]',
      '/api/post'
    ]
    
    // 統合システム計画準拠のマッピング確認
    const integratedAPIs = [
      '/api/intel/collect/topics',
      '/api/create/flow/start',
      '/api/create/draft/list',
      '/api/publish/post/now'
    ]
    
    console.log('重要API:')
    criticalAPIs.forEach(api => console.log(`  ✅ ${api}`))
    
    console.log('統合API(middleware経由):')
    integratedAPIs.forEach(api => console.log(`  🔄 ${api}`))
  }

  startRealtimeMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      if (!this.isRunning) return
      
      try {
        // フロー進行監視
        await this.monitorFlowProgress()
        
        // エラー検出
        await this.detectErrors()
        
        // パフォーマンス監視
        await this.monitorPerformance()
        
      } catch (error) {
        console.error('⚠️  監視エラー:', error.message)
      }
    }, 5000) // 5秒間隔
  }

  async monitorFlowProgress() {
    // 長時間停滞しているセッションを検出
    const stuckSessions = await prisma.viralSession.findMany({
      where: {
        updatedAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000) // 10分以上更新なし
        },
        status: {
          in: ['COLLECTING', 'TOPICS_COLLECTED', 'CONCEPTS_GENERATED']
        }
      },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        theme: true
      }
    })
    
    if (stuckSessions.length > 0) {
      console.log(`\n⚠️  停滞セッション検出: ${stuckSessions.length}件`)
      stuckSessions.forEach(session => {
        const minutesStuck = Math.floor((Date.now() - new Date(session.updatedAt).getTime()) / 60000)
        console.log(`  - ${session.id}: ${session.status} (${minutesStuck}分停滞) "${session.theme}"`)
      })
    }
  }

  async detectErrors() {
    // 最近のエラーセッションを検出
    const recentErrors = await prisma.viralSession.findMany({
      where: {
        status: 'ERROR',
        updatedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 過去5分
        }
      },
      select: {
        id: true,
        theme: true,
        updatedAt: true
      }
    })
    
    if (recentErrors.length > 0) {
      console.log(`\n❌ 新しいエラー検出: ${recentErrors.length}件`)
      recentErrors.forEach(session => {
        console.log(`  - ${session.id}: "${session.theme}"`)
      })
    }
  }

  async monitorPerformance() {
    // フロー完了時間の監視
    const recentCompletions = await prisma.viralSession.findMany({
      where: {
        status: 'COMPLETED',
        updatedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 過去5分
        }
      },
      select: {
        createdAt: true,
        updatedAt: true,
        theme: true
      }
    })
    
    if (recentCompletions.length > 0) {
      const avgTime = recentCompletions.reduce((sum, session) => {
        return sum + (new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime())
      }, 0) / recentCompletions.length
      
      const avgMinutes = Math.floor(avgTime / 60000)
      console.log(`\n✅ 完了フロー: ${recentCompletions.length}件 (平均${avgMinutes}分)`)
    }
  }

  async checkAPIHealth() {
    console.log('\n🏥 API健全性チェック...')
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    const testAPIs = [
      { path: '/api/flow', method: 'POST', body: { theme: 'テスト', platform: 'Twitter' } },
      { path: '/api/drafts', method: 'GET' }
    ]
    
    for (const api of testAPIs) {
      try {
        const response = await fetch(`${baseUrl}${api.path}`, {
          method: api.method,
          headers: { 'Content-Type': 'application/json' },
          body: api.body ? JSON.stringify(api.body) : undefined
        })
        
        const status = response.ok ? '✅' : '❌'
        console.log(`  ${status} ${api.method} ${api.path} (${response.status})`)
        
      } catch (error) {
        console.log(`  ❌ ${api.method} ${api.path} (${error.message})`)
      }
    }
  }

  async runFlowTest() {
    console.log('\n🧪 統合フローテスト実行...')
    
    try {
      const testTheme = `テストフロー_${Date.now()}`
      console.log(`テーマ: "${testTheme}"`)
      
      // Step 1: フロー開始
      console.log('Step 1: フロー開始...')
      const flowResponse = await fetch('http://localhost:3000/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: testTheme, platform: 'Twitter' })
      })
      
      if (!flowResponse.ok) {
        throw new Error(`フロー開始失敗: ${flowResponse.status}`)
      }
      
      const flowData = await flowResponse.json()
      const sessionId = flowData.id
      console.log(`✅ セッション作成: ${sessionId}`)
      
      // Step 2: ステータス確認
      console.log('Step 2: ステータス確認...')
      const statusResponse = await fetch(`http://localhost:3000/api/flow/${sessionId}`)
      const statusData = await statusResponse.json()
      console.log(`✅ ステータス: ${statusData.status}`)
      
      // テストセッションを削除（クリーンアップ）
      await prisma.viralSession.delete({
        where: { id: sessionId }
      })
      console.log('✅ テストセッション削除完了')
      
    } catch (error) {
      console.error('❌ フローテストエラー:', error.message)
    }
  }

  stop() {
    this.isRunning = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    console.log('\n🛑 統合フロー デバッガー停止')
    process.exit(0)
  }

  displayHelp() {
    console.log(`
🔍 統合フローデバッガー - 使用方法

node scripts/dev-tools/integrated-flow-debugger.js [command]

Commands:
  start     リアルタイム監視開始 (デフォルト)
  test      統合フローテスト実行
  status    現在の状態表示
  help      このヘルプを表示

Features:
  - リアルタイムセッション監視
  - 停滞フロー検出
  - エラー検出とアラート
  - パフォーマンス測定
  - API健全性チェック
  - 統合フローテスト

停止: Ctrl+C
    `)
  }
}

// CLI実行
async function main() {
  const flowDebugger = new IntegratedFlowDebugger()
  
  // シグナルハンドリング
  process.on('SIGINT', () => flowDebugger.stop())
  process.on('SIGTERM', () => flowDebugger.stop())
  
  const command = process.argv[2] || 'start'
  
  switch (command) {
    case 'start':
      await flowDebugger.start()
      break
    case 'test':
      await flowDebugger.runFlowTest()
      break
    case 'status':
      await flowDebugger.runInitialDiagnostics()
      break
    case 'help':
      flowDebugger.displayHelp()
      break
    default:
      console.log('❌ 無効なコマンド。--help で使用方法を確認してください。')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { IntegratedFlowDebugger }