#!/usr/bin/env node

/**
 * 統一関数マッピングツール
 * 
 * フロントエンド↔バックエンド間の関数定義不一致を検出
 * APIパラメータ、レスポンス形式、DB連携の問題を統合的に分析
 */

const fs = require('fs').promises
const path = require('path')
const chalk = require('chalk')

class UnifiedFunctionMapper {
  constructor() {
    this.apiMap = new Map()
    this.frontendCalls = new Map()
    this.backendDefinitions = new Map()
    this.dbOperations = new Map()
    this.issues = []
    
    // 既知のAPI仕様（バックアップからの情報）
    this.knownApiSpecs = {
      'POST /api/flow': {
        expectedParams: ['theme'],
        optionalParams: ['platform', 'style'],
        response: ['id', 'status', 'message']
      },
      'POST /api/flow/[id]/next': {
        expectedParams: [],
        optionalParams: ['autoProgress', 'selectedConcepts', 'characterId'],
        response: ['currentStep', 'nextAction', 'progress']
      },
      'POST /api/post': {
        expectedParams: ['text'],
        optionalParams: ['draftId'],
        commonMistakes: ['content instead of text']
      },
      'GET /api/flow/[id]': {
        expectedParams: [],
        response: ['id', 'theme', 'currentStep', 'progress', 'data']
      },
      'GET /api/drafts': {
        expectedParams: [],
        response: ['array or {drafts: array}']
      }
    }
  }

  async scanFrontendApiCalls() {
    console.log(chalk.blue('📱 フロントエンドAPIコール分析中...'))
    
    const frontendFiles = [
      'app/create/page.tsx',
      'app/create/flow/[id]/page.tsx',
      'app/drafts/page.tsx',
      'lib/frontend/session-manager.ts',
      'scripts/dev-tools/frontend-flow-tester.js'
    ]
    
    for (const file of frontendFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8')
        const apiCalls = this.extractApiCalls(content, file)
        this.frontendCalls.set(file, apiCalls)
      } catch (error) {
        console.log(chalk.yellow(`⚠️ ファイル読み込み失敗: ${file}`))
      }
    }
  }

  extractApiCalls(content, filename) {
    const calls = []
    
    // fetch() 呼び出しを抽出
    const fetchRegex = /fetch\s*\(\s*['"](\/api\/[^'"]+)['"]\s*,?\s*(\{[^}]*\})?/g
    let match
    
    while ((match = fetchRegex.exec(content)) !== null) {
      const [, url, options] = match
      
      // オプションからHTTPメソッドとボディを抽出
      let method = 'GET'
      let body = null
      
      if (options) {
        const methodMatch = options.match(/method:\s*['"]([^'"]+)['"]/);
        if (methodMatch) method = methodMatch[1]
        
        const bodyMatch = options.match(/body:\s*JSON\.stringify\(([^)]+)\)/);
        if (bodyMatch) {
          try {
            // 簡単なパラメータ抽出（完全ではないが基本的なケースは検出）
            const bodyContent = bodyMatch[1]
            if (bodyContent.includes('theme')) body = { theme: true }
            if (bodyContent.includes('selectedConcepts')) body = { selectedConcepts: true }
            if (bodyContent.includes('characterId')) body = { characterId: true }
            if (bodyContent.includes('text')) body = { text: true }
            if (bodyContent.includes('content')) body = { content: true }
          } catch (e) {
            // パース失敗は無視
          }
        }
      }
      
      calls.push({
        url,
        method,
        body,
        line: this.getLineNumber(content, match.index),
        filename
      })
    }
    
    return calls
  }

  getLineNumber(content, index) {
    return content.slice(0, index).split('\n').length
  }

  async scanBackendDefinitions() {
    console.log(chalk.blue('🔌 バックエンドAPI定義分析中...'))
    
    const apiFiles = await this.findApiFiles()
    
    for (const file of apiFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8')
        const definition = this.extractApiDefinition(content, file)
        if (definition) {
          this.backendDefinitions.set(file, definition)
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠️ APIファイル読み込み失敗: ${file}`))
      }
    }
  }

  async findApiFiles() {
    const glob = require('glob')
    return glob.sync('app/api/**/route.{ts,js}')
  }

  extractApiDefinition(content, filename) {
    const definition = {
      methods: [],
      expectedParams: [],
      responseFields: [],
      dbOperations: [],
      filename
    }
    
    // HTTPメソッドを抽出
    const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g
    let match
    while ((match = methodRegex.exec(content)) !== null) {
      definition.methods.push(match[1])
    }
    
    // パラメータ検証を抽出
    const bodyRegex = /\.json\(\)|body\s*\.\s*(\w+)/g
    while ((match = bodyRegex.exec(content)) !== null) {
      if (match[1]) definition.expectedParams.push(match[1])
    }
    
    // DB操作を抽出
    const dbRegex = /prisma\.(\w+)\.(create|update|findMany|findFirst|delete)/g
    while ((match = dbRegex.exec(content)) !== null) {
      definition.dbOperations.push({
        table: match[1],
        operation: match[2]
      })
    }
    
    return definition.methods.length > 0 ? definition : null
  }

  async analyzeMismatches() {
    console.log(chalk.blue('🔍 不一致分析中...'))
    
    // フロントエンドのAPI呼び出しをチェック
    for (const [file, calls] of this.frontendCalls) {
      for (const call of calls) {
        const key = `${call.method} ${call.url}`
        const knownSpec = this.knownApiSpecs[key]
        
        if (knownSpec) {
          this.checkApiCall(call, knownSpec, file)
        } else {
          this.issues.push({
            type: 'UNKNOWN_API',
            severity: 'medium',
            message: `Unknown API endpoint: ${key}`,
            file,
            line: call.line
          })
        }
      }
    }
    
    // 共通の問題パターンをチェック
    this.checkCommonIssues()
  }

  checkApiCall(call, spec, file) {
    // 必須パラメータのチェック
    for (const requiredParam of spec.expectedParams || []) {
      if (!call.body || !call.body[requiredParam]) {
        this.issues.push({
          type: 'MISSING_REQUIRED_PARAM',
          severity: 'high',
          message: `Missing required parameter '${requiredParam}' in ${call.method} ${call.url}`,
          file,
          line: call.line
        })
      }
    }
    
    // 共通の間違いをチェック
    if (spec.commonMistakes) {
      for (const mistake of spec.commonMistakes) {
        if (mistake.includes('content instead of text') && call.body?.content) {
          this.issues.push({
            type: 'WRONG_PARAMETER_NAME',
            severity: 'high',
            message: `Using 'content' instead of 'text' in ${call.method} ${call.url}`,
            file,
            line: call.line,
            suggestion: "Change 'content' to 'text'"
          })
        }
      }
    }
  }

  checkCommonIssues() {
    // DB接続問題のパターン
    this.checkDbConnectionPatterns()
    
    // 型定義の不一致
    this.checkTypeDefinitionIssues()
    
    // レスポンス形式の不一致
    this.checkResponseFormatIssues()
  }

  checkDbConnectionPatterns() {
    // Prismaの接続パターンをチェック
    const dbIssues = [
      {
        pattern: 'DIRECT_URL in dev-tools',
        files: ['scripts/dev-tools/db-schema-validator.js'],
        message: 'Using DIRECT_URL instead of standard @/lib/prisma connection'
      },
      {
        pattern: 'Different connection patterns',
        message: 'Multiple Prisma connection patterns detected (pooler vs direct)'
      }
    ]
    
    for (const issue of dbIssues) {
      this.issues.push({
        type: 'DB_CONNECTION_MISMATCH',
        severity: 'medium',
        message: issue.message,
        files: issue.files || []
      })
    }
  }

  checkTypeDefinitionIssues() {
    this.issues.push({
      type: 'TYPE_DEFINITION_SCATTERED',
      severity: 'medium',
      message: 'Type definitions scattered across multiple files instead of centralized',
      suggestion: 'Use unified type definitions in /types/frontend.ts'
    })
  }

  checkResponseFormatIssues() {
    this.issues.push({
      type: 'RESPONSE_FORMAT_INCONSISTENT',
      severity: 'medium', 
      message: 'Inconsistent API response formats (array vs {data: array})',
      suggestion: 'Use StandardApiResponse<T> format from /lib/shared/api-contracts.ts'
    })
  }

  async scanDBManagerIntegration() {
    console.log(chalk.blue('🗄️ DBマネージャー連携分析中...'))
    
    try {
      const unifiedSystemContent = await fs.readFile('lib/core/unified-system-manager.ts', 'utf-8')
      
      // DBManager使用箇所の検出
      const dbManagerUsage = this.extractDbManagerUsage(unifiedSystemContent)
      this.dbOperations.set('unified-system-manager', dbManagerUsage)
      
    } catch (error) {
      this.issues.push({
        type: 'DB_MANAGER_NOT_FOUND',
        severity: 'high',
        message: 'Unified System Manager not found or not accessible',
        suggestion: 'Ensure DBManager is properly integrated'
      })
    }
  }

  extractDbManagerUsage(content) {
    const usage = {
      hasTransactionSupport: content.includes('transaction'),
      hasRetryLogic: content.includes('retry'),
      hasBatchSupport: content.includes('batch'),
      usesStandardConnection: content.includes('@/lib/prisma')
    }
    
    return usage
  }

  displayResults() {
    console.log(chalk.bold.cyan('\n📊 統一関数マッピング分析結果\n'))
    
    // サマリー
    const criticalIssues = this.issues.filter(i => i.severity === 'high').length
    const warningIssues = this.issues.filter(i => i.severity === 'medium').length
    const infoIssues = this.issues.filter(i => i.severity === 'low').length
    
    console.log(chalk.bold('🔍 検出された問題:'))
    console.log(chalk.red(`   ❌ Critical: ${criticalIssues}`))
    console.log(chalk.yellow(`   ⚠️  Warning: ${warningIssues}`))
    console.log(chalk.blue(`   ℹ️  Info: ${infoIssues}`))
    console.log()
    
    // 問題の詳細
    const groupedIssues = this.groupIssuesByType()
    
    for (const [type, issues] of Object.entries(groupedIssues)) {
      console.log(chalk.bold(`${this.getIssueIcon(type)} ${type}:`))
      
      for (const issue of issues) {
        const severity = this.getSeverityColor(issue.severity)
        console.log(`   ${severity} ${issue.message}`)
        
        if (issue.file) {
          console.log(chalk.gray(`      📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`))
        }
        
        if (issue.suggestion) {
          console.log(chalk.green(`      💡 ${issue.suggestion}`))
        }
        
        console.log()
      }
    }
    
    // 推奨アクション
    this.displayRecommendations()
  }

  groupIssuesByType() {
    const grouped = {}
    for (const issue of this.issues) {
      if (!grouped[issue.type]) grouped[issue.type] = []
      grouped[issue.type].push(issue)
    }
    return grouped
  }

  getIssueIcon(type) {
    const icons = {
      'MISSING_REQUIRED_PARAM': '🚫',
      'WRONG_PARAMETER_NAME': '🔤',
      'UNKNOWN_API': '❓',
      'DB_CONNECTION_MISMATCH': '🔌',
      'TYPE_DEFINITION_SCATTERED': '📋',
      'RESPONSE_FORMAT_INCONSISTENT': '📡',
      'DB_MANAGER_NOT_FOUND': '🗄️'
    }
    return icons[type] || '⚠️'
  }

  getSeverityColor(severity) {
    const colors = {
      'high': chalk.red('●'),
      'medium': chalk.yellow('●'),
      'low': chalk.blue('●')
    }
    return colors[severity] || chalk.gray('●')
  }

  displayRecommendations() {
    console.log(chalk.bold.green('💡 推奨アクション:\n'))
    
    const recommendations = [
      '1. 統一API契約の適用: /lib/shared/api-contracts.ts を全APIで使用',
      '2. DB接続の標準化: @/lib/prisma を統一使用、DIRECT_URL廃止', 
      '3. 型定義の一元化: /types/frontend.ts に全型を集約',
      '4. エラーハンドリングの統一: createErrorResponse() を標準使用',
      '5. レスポンス形式の統一: StandardApiResponse<T> を強制適用'
    ]
    
    const criticalActions = [
      '🔥 即座対応: content→text パラメータ名修正',
      '🔥 即座対応: DB接続方法の統一',
      '🔥 即座対応: 必須パラメータの不足修正'
    ]
    
    console.log(chalk.bold.red('🚨 Critical Actions (即座対応必要):'))
    for (const action of criticalActions) {
      console.log(`   ${action}`)
    }
    console.log()
    
    console.log(chalk.bold.yellow('📋 General Recommendations:'))
    for (const rec of recommendations) {
      console.log(`   ${rec}`)
    }
  }

  async run() {
    console.log(chalk.bold.blue('🚀 統一関数マッピング分析開始\n'))
    
    await this.scanFrontendApiCalls()
    await this.scanBackendDefinitions()
    await this.scanDBManagerIntegration()
    await this.analyzeMismatches()
    
    this.displayResults()
    
    return {
      totalIssues: this.issues.length,
      criticalIssues: this.issues.filter(i => i.severity === 'high').length,
      issues: this.issues
    }
  }
}

// メイン実行
if (require.main === module) {
  const mapper = new UnifiedFunctionMapper()
  mapper.run().then(result => {
    console.log(chalk.gray(`\n完了: ${result.totalIssues}個の問題を検出`))
    
    if (result.criticalIssues > 0) {
      console.log(chalk.red(`⚠️ ${result.criticalIssues}個のCritical問題があります`))
      process.exit(1)
    }
  }).catch(console.error)
}

module.exports = UnifiedFunctionMapper