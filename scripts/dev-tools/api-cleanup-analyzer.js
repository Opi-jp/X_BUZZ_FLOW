#!/usr/bin/env node
/**
 * API整理・削減アナライザー
 * 重複と未使用APIの具体的な削除推奨を行う
 */

const fs = require('fs')
const path = require('path')

class APICleanupAnalyzer {
  constructor() {
    this.apiDir = path.join(__dirname, '../../app/api')
    this.duplicateAPIs = {}
    this.unusedAPIs = []
    this.criticalAPIs = [
      '/api/flow',
      '/api/flow/[id]', 
      '/api/flow/[id]/next',
      '/api/drafts',
      '/api/drafts/[id]',
      '/api/post'
    ]
  }

  async analyze() {
    console.log('🔍 API整理・削減アナライザー')
    console.log('=' .repeat(60))
    
    // 1. 重複API分析
    await this.analyzeDuplicates()
    
    // 2. 未使用API分析  
    await this.analyzeUnused()
    
    // 3. 削除推奨の生成
    this.generateDeletionRecommendations()
    
    // 4. 統合推奨の生成
    this.generateConsolidationRecommendations()
  }

  async analyzeDuplicates() {
    console.log('\\n📂 重複API分析...')
    
    const duplicateGroups = {
      drafts: [
        '/api/generation/drafts',
        '/api/generation/content/sessions/[id]/drafts', 
        '/api/generation/content/session/[sessionId]/drafts',
        '/api/drafts'  // ← 正規版
      ],
      collect: [
        '/api/intelligence/news/collect',
        '/api/intel/news/collect',
        '/api/generation/content/sessions/[id]/collect', // ← 使用中
        '/api/collect'
      ],
      generate: [
        '/api/posting-plan/generate',
        '/api/generation/content/sessions/[id]/generate', // ← 使用中
        '/api/generate'
      ],
      post: [
        '/api/twitter/post',
        '/api/post'  // ← 正規版
      ],
      debug: [
        '/api/intelligence/news/debug',
        '/api/auth/debug',
        '/api/debug/*'  // ← 複数の debug API
      ]
    }
    
    for (const [group, apis] of Object.entries(duplicateGroups)) {
      console.log(`\\n🔄 ${group.toUpperCase()}グループ:`)
      
      const keepAPI = this.findKeepAPI(apis)
      const deleteAPIs = apis.filter(api => api !== keepAPI)
      
      console.log(`  ✅ 保持: ${keepAPI}`)
      deleteAPIs.forEach(api => {
        console.log(`  ❌ 削除推奨: ${api}`)
      })
      
      this.duplicateAPIs[group] = {
        keep: keepAPI,
        delete: deleteAPIs
      }
    }
  }

  findKeepAPI(apis) {
    // 最もシンプルなパスを保持
    const sorted = apis.sort((a, b) => {
      // Critical APIは優先
      if (this.criticalAPIs.includes(a)) return -1
      if (this.criticalAPIs.includes(b)) return 1
      
      // 短いパスを優先
      const aDepth = a.split('/').length
      const bDepth = b.split('/').length
      return aDepth - bDepth
    })
    
    return sorted[0]
  }

  async analyzeUnused() {
    console.log('\\n🗑️  未使用API分析...')
    
    // 明らかに削除可能なパターン
    const safeToDelete = [
      '/api/debug/',
      '/api/auth/test-',
      '/api/auth/debug',
      '/api/auth/twitter-test',
      '/api/generation/content/session/', // 旧セッション系
      '/api/intelligence/news/test-',
      '/api/intelligence/news/debug',
      '/api/intel/collect/topics', // 新規作成したが使用されていない
      '/api/db/migrate',
      '/api/cron/scheduled-', // cronは除外対象外
    ]
    
    const riskyToDelete = [
      '/api/intelligence/', // ニュースシステム
      '/api/automation/', // 自動化システム
      '/api/cron/', // 定期実行
    ]
    
    // 実際のファイル存在確認
    const allAPIs = this.scanAPIDirectory()
    
    console.log('\\n安全に削除可能:')
    allAPIs.forEach(api => {
      if (safeToDelete.some(pattern => api.includes(pattern))) {
        console.log(`  🗑️  ${api}`)
        this.unusedAPIs.push(api)
      }
    })
    
    console.log('\\n⚠️  削除注意（機能確認必要）:')
    allAPIs.forEach(api => {
      if (riskyToDelete.some(pattern => api.includes(pattern))) {
        console.log(`  ⚠️  ${api}`)
      }
    })
  }

  scanAPIDirectory() {
    const apis = []
    
    function scanRecursive(dir, prefix = '/api') {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)
        
        if (stat.isDirectory()) {
          // [id] などの動的パラメータを検出
          const apiPath = item.startsWith('[') && item.endsWith(']') 
            ? `${prefix}/[${item.slice(1, -1)}]`
            : `${prefix}/${item}`
          scanRecursive(itemPath, apiPath)
        } else if (item === 'route.ts' || item === 'route.js') {
          apis.push(prefix)
        }
      }
    }
    
    if (fs.existsSync(this.apiDir)) {
      scanRecursive(this.apiDir)
    }
    
    return apis
  }

  generateDeletionRecommendations() {
    console.log('\\n📋 削除推奨スクリプト生成...')
    
    const deletionScript = []
    deletionScript.push('#!/bin/bash')
    deletionScript.push('# API削除スクリプト（重複・未使用API削除）')
    deletionScript.push('# 実行前に必ずバックアップを取ってください')
    deletionScript.push('')
    
    // 重複API削除
    for (const [group, config] of Object.entries(this.duplicateAPIs)) {
      deletionScript.push(`# ${group.toUpperCase()}グループの重複削除`)
      config.delete.forEach(api => {
        const filePath = this.apiToFilePath(api)
        if (filePath) {
          deletionScript.push(`echo "削除: ${api}"`)
          deletionScript.push(`rm -rf "${filePath}"`)
        }
      })
      deletionScript.push('')
    }
    
    // 未使用API削除
    deletionScript.push('# 未使用API削除')
    this.unusedAPIs.forEach(api => {
      const filePath = this.apiToFilePath(api)
      if (filePath) {
        deletionScript.push(`echo "削除: ${api}"`)
        deletionScript.push(`rm -rf "${filePath}"`)
      }
    })
    
    const scriptPath = path.join(__dirname, '../../scripts/cleanup-apis.sh')
    fs.writeFileSync(scriptPath, deletionScript.join('\\n'))
    fs.chmodSync(scriptPath, '755')
    
    console.log(`\\n💾 削除スクリプト生成完了: ${scriptPath}`)
    console.log('\\n⚠️  実行前の注意:')
    console.log('  1. 必ずgitでバックアップを取る')
    console.log('  2. 削除対象APIが本当に不要か確認')
    console.log('  3. テスト環境で先に実行')
  }

  apiToFilePath(apiPath) {
    // /api/generation/drafts → app/api/generation/drafts
    const relativePath = apiPath.replace('/api/', 'app/api/')
    const fullPath = path.join(__dirname, '../..', relativePath)
    
    // [id] などの動的パラメータ処理
    const normalizedPath = fullPath.replace(/\[([^\]]+)\]/g, '[$1]')
    
    return normalizedPath
  }

  generateConsolidationRecommendations() {
    console.log('\\n🔧 API統合推奨...')
    
    const consolidations = [
      {
        description: 'drafts関連APIの統合',
        target: '/api/drafts',
        sources: ['/api/generation/drafts', '/api/generation/content/sessions/[id]/drafts'],
        action: 'middleware.tsでリダイレクト'
      },
      {
        description: 'collect関連APIの統合', 
        target: '/api/generation/content/sessions/[id]/collect',
        sources: ['/api/intelligence/news/collect', '/api/intel/news/collect'],
        action: 'middleware.tsでリダイレクト'
      },
      {
        description: 'post関連APIの統合',
        target: '/api/post',
        sources: ['/api/twitter/post'],
        action: 'middleware.tsでリダイレクト（既に実装済み）'
      }
    ]
    
    consolidations.forEach(item => {
      console.log(`\\n📌 ${item.description}:`)
      console.log(`  🎯 統合先: ${item.target}`)
      console.log(`  📂 統合元: ${item.sources.join(', ')}`)
      console.log(`  🔧 対応: ${item.action}`)
    })
  }

  displaySummary() {
    console.log('\\n📊 整理サマリー:')
    
    const totalDuplicates = Object.values(this.duplicateAPIs)
      .reduce((sum, group) => sum + group.delete.length, 0)
    
    console.log(`重複API削除対象: ${totalDuplicates}個`)
    console.log(`未使用API削除対象: ${this.unusedAPIs.length}個`)
    console.log(`推定削減効果: ${totalDuplicates + this.unusedAPIs.length}個削除`)
    console.log(`目標との差分: 124個 → ${124 - totalDuplicates - this.unusedAPIs.length}個`)
    
    if (124 - totalDuplicates - this.unusedAPIs.length <= 30) {
      console.log('\\n✅ 目標の30個以下に到達可能！')
    } else {
      console.log('\\n⚠️  追加の削減が必要')
    }
  }
}

// CLI実行
async function main() {
  const analyzer = new APICleanupAnalyzer()
  await analyzer.analyze()
  analyzer.displaySummary()
}

if (require.main === module) {
  main().catch(console.error)
}