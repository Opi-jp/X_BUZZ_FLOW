#!/usr/bin/env node
/**
 * API層監視システム
 * Phase 3: デバッグ機能強化
 * 
 * 全APIエンドポイントの健全性とパフォーマンスを監視
 * 統合システム計画準拠のマッピング状況も確認
 */

const fs = require('fs')
const path = require('path')

class APILayerMonitor {
  constructor() {
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    this.monitoringData = {
      timestamp: new Date().toISOString(),
      apiStatus: {},
      mappingStatus: {},
      performanceMetrics: {},
      errors: []
    }
  }

  async start() {
    console.log('🔍 API層監視システム開始')
    console.log('=' .repeat(60))
    
    // Critical APIs check
    await this.checkCriticalAPIs()
    
    // Integrated mapping check
    await this.checkIntegratedMapping()
    
    // Performance benchmarks
    await this.runPerformanceBenchmarks()
    
    // API dependency validation
    await this.validateAPIDependencies()
    
    // Generate report
    this.generateReport()
  }

  async checkCriticalAPIs() {
    console.log('\\n🎯 重要API エンドポイント確認...')
    
    const criticalAPIs = [
      {
        name: 'Flow Start',
        path: '/api/flow',
        method: 'POST',
        body: { theme: 'テスト監視', platform: 'Twitter' },
        expected: { status: 200, hasId: true }
      },
      {
        name: 'Drafts List',
        path: '/api/drafts',
        method: 'GET',
        expected: { status: 200, hasArray: true }
      },
      {
        name: 'Health Check',
        path: '/api/health',
        method: 'GET',
        expected: { status: 200 },
        optional: true
      }
    ]
    
    for (const api of criticalAPIs) {
      try {
        const startTime = Date.now()
        const response = await fetch(`${this.baseUrl}${api.path}`, {
          method: api.method,
          headers: { 'Content-Type': 'application/json' },
          body: api.body ? JSON.stringify(api.body) : undefined
        })
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        const data = await response.json().catch(() => null)
        
        const status = response.ok ? '✅' : '❌'
        const timing = responseTime < 1000 ? '🟢' : responseTime < 3000 ? '🟡' : '🔴'
        
        console.log(`  ${status} ${timing} ${api.name}: ${response.status} (${responseTime}ms)`)
        
        this.monitoringData.apiStatus[api.name] = {
          status: response.status,
          ok: response.ok,
          responseTime,
          hasData: !!data,
          endpoint: api.path
        }
        
        // Clean up test data if created
        if (api.name === 'Flow Start' && data?.id) {
          await this.cleanupTestSession(data.id)
        }
        
      } catch (error) {
        console.log(`  ❌ ⚫ ${api.name}: ${error.message}`)
        this.monitoringData.errors.push({
          api: api.name,
          error: error.message,
          endpoint: api.path
        })
      }
    }
  }

  async checkIntegratedMapping() {
    console.log('\\n🔄 統合システムマッピング確認...')
    
    const mappingTests = [
      {
        name: 'Intel → Flow',
        originalPath: '/api/intel/collect/topics',
        mappedTo: '/api/flow',
        method: 'POST',
        body: { theme: 'マッピングテスト', platform: 'Twitter' }
      },
      {
        name: 'Create → Flow',
        originalPath: '/api/create/flow/start',
        mappedTo: '/api/flow',
        method: 'POST',
        body: { theme: 'マッピングテスト2', platform: 'Twitter' }
      },
      {
        name: 'Publish → Post',
        originalPath: '/api/publish/post/now',
        mappedTo: '/api/post',
        method: 'POST',
        body: { text: 'テスト投稿', draftId: null }
      }
    ]
    
    for (const mapping of mappingTests) {
      try {
        const response = await fetch(`${this.baseUrl}${mapping.originalPath}`, {
          method: mapping.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mapping.body)
        })
        
        const isRedirected = response.url.includes(mapping.mappedTo.replace('/api', ''))
        const status = response.ok ? '✅' : '❌'
        const redirect = isRedirected ? '🔄' : '📍'
        
        console.log(`  ${status} ${redirect} ${mapping.name}: ${response.status}`)
        
        this.monitoringData.mappingStatus[mapping.name] = {
          works: response.ok,
          redirected: isRedirected,
          status: response.status
        }
        
      } catch (error) {
        console.log(`  ❌ ⚫ ${mapping.name}: ${error.message}`)
        this.monitoringData.mappingStatus[mapping.name] = {
          works: false,
          error: error.message
        }
      }
    }
  }

  async runPerformanceBenchmarks() {
    console.log('\\n⚡ パフォーマンス ベンチマーク...')
    
    const benchmarks = [
      {
        name: 'API Response Time',
        test: () => this.measureAPIResponseTime()
      },
      {
        name: 'Concurrent Requests',
        test: () => this.measureConcurrentRequests()
      },
      {
        name: 'Database Query Time',
        test: () => this.measureDatabasePerformance()
      }
    ]
    
    for (const benchmark of benchmarks) {
      try {
        const result = await benchmark.test()
        console.log(`  ✅ ${benchmark.name}: ${this.formatPerformanceResult(result)}`)
        this.monitoringData.performanceMetrics[benchmark.name] = result
      } catch (error) {
        console.log(`  ❌ ${benchmark.name}: ${error.message}`)
        this.monitoringData.performanceMetrics[benchmark.name] = { error: error.message }
      }
    }
  }

  async measureAPIResponseTime() {
    const tests = []
    const iterations = 5
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      try {
        await fetch(`${this.baseUrl}/api/drafts`)
        tests.push(Date.now() - startTime)
      } catch (error) {
        // Skip failed requests
      }
    }
    
    if (tests.length === 0) throw new Error('All requests failed')
    
    return {
      average: Math.round(tests.reduce((a, b) => a + b) / tests.length),
      min: Math.min(...tests),
      max: Math.max(...tests),
      samples: tests.length
    }
  }

  async measureConcurrentRequests() {
    const concurrentRequests = 10
    const startTime = Date.now()
    
    const promises = Array(concurrentRequests).fill().map(() =>
      fetch(`${this.baseUrl}/api/drafts`).catch(() => null)
    )
    
    const results = await Promise.all(promises)
    const successful = results.filter(r => r && r.ok).length
    const totalTime = Date.now() - startTime
    
    return {
      total: concurrentRequests,
      successful,
      totalTime,
      avgPerRequest: Math.round(totalTime / concurrentRequests)
    }
  }

  async measureDatabasePerformance() {
    // Simple database performance test via API
    const startTime = Date.now()
    try {
      const response = await fetch(`${this.baseUrl}/api/drafts?limit=10`)
      const data = await response.json()
      const queryTime = Date.now() - startTime
      
      return {
        queryTime,
        recordCount: data.drafts?.length || 0,
        hasData: !!data.drafts
      }
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }
  }

  formatPerformanceResult(result) {
    if (result.error) return `Error: ${result.error}`
    if (result.average) return `${result.average}ms avg (${result.min}-${result.max}ms)`
    if (result.queryTime) return `${result.queryTime}ms (${result.recordCount} records)`
    if (result.totalTime) return `${result.successful}/${result.total} successful in ${result.totalTime}ms`
    return JSON.stringify(result)
  }

  async validateAPIDependencies() {
    console.log('\\n🔗 API依存関係検証...')
    
    try {
      // Check if API dependency scanner is available
      const { execSync } = require('child_process')
      const scanResult = execSync('node scripts/dev-tools/api-dependency-scanner.js', { 
        encoding: 'utf8',
        timeout: 10000 
      })
      
      const endpointCount = scanResult.match(/総APIエンドポイント数: (\\d+)/)?.[1]
      const unusedCount = scanResult.match(/未使用のAPI数: (\\d+)/)?.[1]
      
      if (endpointCount) {
        console.log(`  📊 総エンドポイント数: ${endpointCount}`)
        console.log(`  📊 未使用API数: ${unusedCount || '不明'}`)
        
        this.monitoringData.apiDependencies = {
          totalEndpoints: parseInt(endpointCount),
          unusedEndpoints: parseInt(unusedCount || 0)
        }
        
        // Alert if too many endpoints
        if (parseInt(endpointCount) > 30) {
          console.log(`  ⚠️  警告: APIエンドポイント数が多すぎます (${endpointCount} > 30)`)
        }
      }
      
    } catch (error) {
      console.log(`  ⚠️  依存関係スキャナーが利用できません: ${error.message}`)
    }
  }

  async cleanupTestSession(sessionId) {
    try {
      // Try to delete test session (best effort)
      await fetch(`${this.baseUrl}/api/generation/content/sessions/${sessionId}`, {
        method: 'DELETE'
      })
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  generateReport() {
    console.log('\\n📊 監視レポート生成...')
    
    const reportPath = path.join(__dirname, '../../reports/api-monitoring')
    
    // Ensure reports directory exists
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    }
    
    // Generate JSON report
    const jsonReport = JSON.stringify(this.monitoringData, null, 2)
    fs.writeFileSync(`${reportPath}-${Date.now()}.json`, jsonReport)
    
    // Generate summary
    const summary = this.generateSummary()
    console.log('\\n' + summary)
    
    fs.writeFileSync(`${reportPath}-latest.txt`, summary)
    console.log(`\\n💾 レポート保存: ${reportPath}-latest.txt`)
  }

  generateSummary() {
    const apis = Object.values(this.monitoringData.apiStatus)
    const workingAPIs = apis.filter(api => api.ok).length
    const totalAPIs = apis.length
    
    const mappings = Object.values(this.monitoringData.mappingStatus)
    const workingMappings = mappings.filter(m => m.works).length
    const totalMappings = mappings.length
    
    const errors = this.monitoringData.errors.length
    
    return `
🔍 API層監視サマリー
=====================
監視時刻: ${this.monitoringData.timestamp}

📍 API状態:
  - 動作中: ${workingAPIs}/${totalAPIs}
  - エラー: ${errors}件

🔄 マッピング状態:
  - 動作中: ${workingMappings}/${totalMappings}

⚡ パフォーマンス:
  - API応答時間: ${this.monitoringData.performanceMetrics['API Response Time']?.average || 'N/A'}ms
  - 同時接続: ${this.monitoringData.performanceMetrics['Concurrent Requests']?.successful || 'N/A'}件成功

📊 依存関係:
  - 総エンドポイント: ${this.monitoringData.apiDependencies?.totalEndpoints || 'N/A'}
  - 未使用: ${this.monitoringData.apiDependencies?.unusedEndpoints || 'N/A'}

${errors > 0 ? '⚠️  エラーが検出されました。詳細はJSONレポートを確認してください。' : '✅ 全システム正常'}
`
  }
}

// CLI実行
async function main() {
  const monitor = new APILayerMonitor()
  
  const command = process.argv[2] || 'start'
  
  switch (command) {
    case 'start':
    case 'monitor':
      await monitor.start()
      break
    case 'help':
      console.log(`
🔍 API層監視システム

Usage: node scripts/dev-tools/api-layer-monitor.js [command]

Commands:
  start, monitor    監視実行 (デフォルト)
  help             このヘルプを表示

Features:
  - 重要APIエンドポイントの健全性チェック
  - 統合システムマッピングの動作確認
  - パフォーマンスベンチマーク
  - API依存関係の検証
  - 監視レポートの生成
      `)
      break
    default:
      console.log('❌ 無効なコマンド。help で使用方法を確認してください。')
  }
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { APILayerMonitor }