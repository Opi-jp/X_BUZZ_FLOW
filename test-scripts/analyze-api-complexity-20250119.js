#!/usr/bin/env node

/**
 * APIの複雑性を分析してシンプル化提案を行う
 * Date: 2025-01-19
 */

const fs = require('fs').promises
const path = require('path')
const chalk = require('chalk')

async function findAllAPIs(dir, apis = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await findAllAPIs(fullPath, apis)
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      const relativePath = fullPath.replace(process.cwd(), '').replace(/\\/g, '/')
      const apiPath = relativePath
        .replace('/app/api', '')
        .replace('/route.ts', '')
        .replace('/route.js', '')
      apis.push({
        path: apiPath,
        file: relativePath
      })
    }
  }
  
  return apis
}

async function analyzeAPIComplexity() {
  console.log(chalk.yellow('🔍 API複雑性分析\n'))
  
  const apiDir = path.join(process.cwd(), 'app', 'api')
  const apis = await findAllAPIs(apiDir)
  
  // カテゴリ別に分類
  const categories = {
    generation: [],
    intelligence: [],
    automation: [],
    integration: [],
    viral: [],
    twitter: [],
    news: [],
    buzz: [],
    other: []
  }
  
  apis.forEach(api => {
    const pathLower = api.path.toLowerCase()
    if (pathLower.includes('/generation/')) categories.generation.push(api)
    else if (pathLower.includes('/intelligence/')) categories.intelligence.push(api)
    else if (pathLower.includes('/automation/')) categories.automation.push(api)
    else if (pathLower.includes('/integration/')) categories.integration.push(api)
    else if (pathLower.includes('/viral/')) categories.viral.push(api)
    else if (pathLower.includes('/twitter/')) categories.twitter.push(api)
    else if (pathLower.includes('/news/')) categories.news.push(api)
    else if (pathLower.includes('/buzz/')) categories.buzz.push(api)
    else categories.other.push(api)
  })
  
  // 統計表示
  console.log(chalk.blue('📊 API統計:'))
  console.log(`総API数: ${apis.length}`)
  console.log()
  
  Object.entries(categories).forEach(([cat, apis]) => {
    if (apis.length > 0) {
      console.log(`${chalk.cyan(cat)}: ${apis.length}個`)
    }
  })
  
  // 本質的に必要なAPIの特定
  console.log(chalk.green('\n\n✅ 本質的に必要なAPI（シンプル化提案）:\n'))
  
  const essentialAPIs = {
    '1. セッション管理': [
      'POST /api/sessions - セッション作成',
      'GET  /api/sessions/[id] - ステータス確認',
      'DELETE /api/sessions/[id] - セッション削除'
    ],
    '2. コンテンツ生成フロー': [
      'POST /api/sessions/[id]/collect - Perplexityで情報収集',
      'POST /api/sessions/[id]/generate - GPTでコンセプト生成',
      'POST /api/sessions/[id]/finalize - Claudeで最終生成'
    ],
    '3. 下書き・投稿': [
      'GET  /api/drafts - 下書き一覧',
      'POST /api/drafts - 下書き作成',
      'PUT  /api/drafts/[id] - 下書き編集',
      'POST /api/post - Twitter投稿',
      'POST /api/schedule - スケジュール投稿'
    ],
    '4. 情報収集（オプション）': [
      'GET  /api/news - ニュース取得',
      'GET  /api/trends - トレンド取得'
    ]
  }
  
  Object.entries(essentialAPIs).forEach(([category, apis]) => {
    console.log(chalk.yellow(category))
    apis.forEach(api => console.log(`  ${api}`))
    console.log()
  })
  
  // 現在のフロー
  console.log(chalk.blue('📈 現在の主要フロー:\n'))
  console.log('1. theme入力 → セッション作成')
  console.log('2. Perplexity収集 → topics保存')
  console.log('3. GPT生成 → concepts保存')
  console.log('4. Claude生成 → contents保存')
  console.log('5. 下書き作成 → 編集 → 投稿')
  
  // 問題点
  console.log(chalk.red('\n\n❌ 問題点:\n'))
  console.log('1. 同じ機能に複数のエンドポイント')
  console.log('2. 深すぎるネスト構造 (/sessions/[id]/concepts/[conceptId]/...)')
  console.log('3. 旧システムと新システムの混在')
  console.log('4. デバッグ用APIが本番に混入')
  
  // 提案
  console.log(chalk.green('\n\n💡 シンプル化の提案:\n'))
  console.log('1. APIを15個程度に削減（現在の117個から）')
  console.log('2. フラットな構造（/api/[action]/[resource]）')
  console.log('3. 旧システムの完全削除')
  console.log('4. RESTful原則の徹底')
  
  // 重複API検出
  console.log(chalk.yellow('\n\n🔍 重複の可能性があるAPI:\n'))
  
  const duplicates = {
    'セッション作成': categories.generation.filter(api => 
      api.path.includes('session') && api.path.includes('create')),
    'コンセプト生成': categories.generation.filter(api => 
      api.path.includes('concept') || api.path.includes('generate')),
    '下書き管理': [...categories.generation, ...categories.automation].filter(api => 
      api.path.includes('draft'))
  }
  
  Object.entries(duplicates).forEach(([func, apis]) => {
    if (apis.length > 1) {
      console.log(chalk.cyan(`${func}: ${apis.length}個`))
      apis.forEach(api => console.log(`  - ${api.path}`))
    }
  })
}

analyzeAPIComplexity().catch(console.error)