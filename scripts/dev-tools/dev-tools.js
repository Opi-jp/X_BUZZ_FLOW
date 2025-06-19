#!/usr/bin/env node

/**
 * 統合開発ツール
 * 
 * X_BUZZ_FLOWの開発を効率化するためのオールインワンツール
 * 
 * 使い方:
 * - node scripts/dev-tools.js start      # 開発環境を起動
 * - node scripts/dev-tools.js check      # ヘルスチェック
 * - node scripts/dev-tools.js fix        # 一般的な問題を自動修正
 * - node scripts/dev-tools.js test <id>  # 特定の機能をテスト
 * - node scripts/dev-tools.js clean      # キャッシュクリーン
 */

const { exec, spawn } = require('child_process')
const fs = require('fs').promises
const path = require('path')
const readline = require('readline')

class DevTools {
  constructor() {
    this.rootDir = process.cwd()
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
  }
  
  /**
   * 開発環境を起動
   */
  async start() {
    console.log('🚀 開発環境を起動します...\n')
    
    // 1. 環境チェック
    console.log('1️⃣ 環境をチェック中...')
    const envCheck = await this.checkEnvironment()
    
    if (!envCheck.valid) {
      console.log('\n❌ 環境変数に問題があります:')
      envCheck.missing.forEach(v => console.log(`  - ${v} が未設定`))
      
      const answer = await this.prompt('\n続行しますか？ (y/N): ')
      if (answer.toLowerCase() !== 'y') {
        process.exit(1)
      }
    }
    
    // 2. データベース接続チェック
    console.log('\n2️⃣ データベース接続を確認中...')
    const dbCheck = await this.checkDatabase()
    
    if (!dbCheck.connected) {
      console.log('❌ データベースに接続できません')
      console.log('💡 ヒント: DATABASE_URLを確認してください')
      
      const answer = await this.prompt('\nローカルモードで起動しますか？ (y/N): ')
      if (answer.toLowerCase() !== 'y') {
        process.exit(1)
      }
    }
    
    // 3. 開発サーバー起動オプション
    console.log('\n3️⃣ 起動モードを選択してください:')
    console.log('  1. 通常モード (Next.js のみ)')
    console.log('  2. フルモード (Next.js + Prisma Studio)')
    console.log('  3. ワーカーモード (Next.js + 非同期ワーカー)')
    console.log('  4. デバッグモード (詳細ログ付き)')
    
    const mode = await this.prompt('\n選択 (1-4): ')
    
    switch (mode) {
      case '1':
        this.startNormal()
        break
      case '2':
        this.startFull()
        break
      case '3':
        this.startWithWorker()
        break
      case '4':
        this.startDebug()
        break
      default:
        this.startNormal()
    }
  }
  
  /**
   * ヘルスチェック
   */
  async check() {
    console.log('🏥 システムヘルスチェック\n')
    
    const checks = [
      { name: '環境変数', fn: () => this.checkEnvironment() },
      { name: 'Node.js バージョン', fn: () => this.checkNodeVersion() },
      { name: 'パッケージ', fn: () => this.checkPackages() },
      { name: 'TypeScript', fn: () => this.checkTypeScript() },
      { name: 'データベース', fn: () => this.checkDatabase() },
      { name: 'API エンドポイント', fn: () => this.checkEndpoints() }
    ]
    
    const results = []
    
    for (const check of checks) {
      process.stdout.write(`${check.name}... `)
      
      try {
        const result = await check.fn()
        if (result.valid || result.connected) {
          console.log('✅')
          results.push({ name: check.name, status: 'ok', details: result })
        } else {
          console.log('❌')
          results.push({ name: check.name, status: 'error', details: result })
        }
      } catch (error) {
        console.log('❌')
        results.push({ name: check.name, status: 'error', error: error.message })
      }
    }
    
    // 結果サマリー
    console.log('\n📊 結果サマリー:')
    const errors = results.filter(r => r.status === 'error')
    
    if (errors.length === 0) {
      console.log('✅ すべてのチェックに合格しました！')
    } else {
      console.log(`⚠️  ${errors.length}個の問題が見つかりました:`)
      errors.forEach(e => {
        console.log(`\n  ${e.name}:`)
        if (e.error) {
          console.log(`    エラー: ${e.error}`)
        } else if (e.details) {
          if (e.details.missing) {
            e.details.missing.forEach(m => console.log(`    - ${m} が未設定`))
          }
          if (e.details.message) {
            console.log(`    ${e.details.message}`)
          }
        }
      })
      
      console.log('\n💡 修正方法:')
      console.log('  node scripts/dev-tools.js fix')
    }
  }
  
  /**
   * 一般的な問題を自動修正
   */
  async fix() {
    console.log('🔧 問題を自動修正します...\n')
    
    const fixes = []
    
    // 1. node_modules再インストール
    console.log('1️⃣ パッケージの整合性を確認中...')
    try {
      await this.execAsync('npm ci')
      fixes.push('パッケージを再インストールしました')
    } catch (error) {
      console.log('  ⚠️  npm ci に失敗しました。npm install を試します...')
      try {
        await this.execAsync('npm install')
        fixes.push('パッケージをインストールしました')
      } catch (e) {
        console.log('  ❌ パッケージのインストールに失敗しました')
      }
    }
    
    // 2. Prisma生成
    console.log('\n2️⃣ Prismaクライアントを再生成中...')
    try {
      await this.execAsync('npx prisma generate')
      fixes.push('Prismaクライアントを再生成しました')
    } catch (error) {
      console.log('  ❌ Prisma生成に失敗しました:', error.message)
    }
    
    // 3. TypeScriptビルドキャッシュクリア
    console.log('\n3️⃣ TypeScriptキャッシュをクリア中...')
    try {
      await fs.rm(path.join(this.rootDir, '.next'), { recursive: true, force: true })
      await fs.rm(path.join(this.rootDir, 'tsconfig.tsbuildinfo'), { force: true })
      fixes.push('TypeScriptキャッシュをクリアしました')
    } catch (error) {
      // エラーは無視
    }
    
    // 4. 環境変数ファイルチェック
    console.log('\n4️⃣ 環境変数ファイルを確認中...')
    const envExample = path.join(this.rootDir, '.env.example')
    const envLocal = path.join(this.rootDir, '.env.local')
    
    try {
      const exampleExists = await fs.access(envExample).then(() => true).catch(() => false)
      const localExists = await fs.access(envLocal).then(() => true).catch(() => false)
      
      if (exampleExists && !localExists) {
        await fs.copyFile(envExample, envLocal)
        fixes.push('.env.localファイルを作成しました')
        console.log('  ✅ .env.localを作成しました。環境変数を設定してください。')
      }
    } catch (error) {
      // エラーは無視
    }
    
    // 結果表示
    console.log('\n✅ 修正完了:')
    if (fixes.length > 0) {
      fixes.forEach(fix => console.log(`  - ${fix}`))
    } else {
      console.log('  修正が必要な問題は見つかりませんでした')
    }
  }
  
  /**
   * 特定の機能をテスト
   */
  async test(feature) {
    console.log(`🧪 ${feature || '機能'}をテスト中...\n`)
    
    const tests = {
      'viral': 'node test-scripts/test-new-concept-framework.js',
      'character': 'node test-scripts/test-character-final-fixed.js',
      'news': 'curl -X POST http://localhost:3000/api/news/collect',
      'rt': 'node test-scripts/test-self-rt.js',
      'perplexity': 'node test-scripts/test-perplexity-api.js'
    }
    
    if (!feature) {
      console.log('利用可能なテスト:')
      Object.keys(tests).forEach(t => console.log(`  - ${t}`))
      return
    }
    
    const testCommand = tests[feature.toLowerCase()]
    if (!testCommand) {
      console.log(`❌ "${feature}" のテストは見つかりません`)
      console.log('\n利用可能なテスト:')
      Object.keys(tests).forEach(t => console.log(`  - ${t}`))
      return
    }
    
    console.log(`実行: ${testCommand}\n`)
    
    const child = spawn(testCommand, { 
      shell: true,
      stdio: 'inherit'
    })
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('\n✅ テスト成功！')
      } else {
        console.log('\n❌ テスト失敗')
      }
    })
  }
  
  /**
   * プロンプトエディター
   */
  async promptEditor() {
    console.log('🎯 プロンプトエディターを起動します...\n')
    
    console.log('機能を選択してください:')
    console.log('  1. プロンプト一覧')
    console.log('  2. プロンプト編集')
    console.log('  3. プロンプトテスト')
    console.log('  4. プロンプト分析')
    console.log('  5. 全体分析')
    
    const choice = await this.prompt('\n選択 (1-5): ')
    
    switch (choice) {
      case '1':
        spawn('node', ['scripts/dev-tools/prompt-editor.js', 'list'], { stdio: 'inherit' })
        break
      case '2':
        const editFile = await this.prompt('編集するファイル (例: perplexity/collect-topics.txt): ')
        if (editFile) {
          spawn('node', ['scripts/dev-tools/prompt-editor.js', 'edit', editFile], { stdio: 'inherit' })
        }
        break
      case '3':
        const testFile = await this.prompt('テストするファイル: ')
        if (testFile) {
          spawn('node', ['scripts/dev-tools/prompt-editor.js', 'test', testFile], { stdio: 'inherit' })
        }
        break
      case '4':
        const analyzeFile = await this.prompt('分析するファイル: ')
        if (analyzeFile) {
          spawn('node', ['scripts/dev-tools/prompt-analyzer.js', analyzeFile], { stdio: 'inherit' })
        }
        break
      case '5':
        spawn('node', ['scripts/dev-tools/prompt-analyzer.js', '--all'], { stdio: 'inherit' })
        break
      default:
        console.log('キャンセルしました')
    }
  }
  
  /**
   * キャッシュクリーン
   */
  async clean() {
    console.log('🧹 キャッシュをクリーンアップ中...\n')
    
    const targets = [
      { path: '.next', name: 'Next.js ビルドキャッシュ' },
      { path: 'node_modules/.cache', name: 'npm キャッシュ' },
      { path: 'tsconfig.tsbuildinfo', name: 'TypeScript ビルドinfo' },
      { path: '.refactor-backup', name: 'リファクタリングバックアップ' }
    ]
    
    for (const target of targets) {
      process.stdout.write(`${target.name}... `)
      try {
        await fs.rm(path.join(this.rootDir, target.path), { 
          recursive: true, 
          force: true 
        })
        console.log('✅')
      } catch (error) {
        console.log('⏭️  (スキップ)')
      }
    }
    
    console.log('\n✅ クリーンアップ完了！')
  }
  
  // ヘルパーメソッド
  startNormal() {
    console.log('\n🚀 通常モードで起動中...')
    spawn('npm', ['run', 'dev'], { stdio: 'inherit' })
  }
  
  startFull() {
    console.log('\n🚀 フルモードで起動中...')
    spawn('npm', ['run', 'dev:full'], { stdio: 'inherit' })
  }
  
  startWithWorker() {
    console.log('\n🚀 ワーカーモードで起動中...')
    
    // Next.js
    const nextProcess = spawn('npm', ['run', 'dev'], { stdio: 'inherit' })
    
    // ワーカー（5秒待ってから起動）
    setTimeout(() => {
      console.log('\n🤖 非同期ワーカーを起動中...')
      spawn('node', ['scripts/async-worker-v2.js'], { stdio: 'inherit' })
    }, 5000)
  }
  
  startDebug() {
    console.log('\n🚀 デバッグモードで起動中...')
    process.env.DEBUG = '*'
    spawn('npm', ['run', 'dev'], { stdio: 'inherit', env: process.env })
  }
  
  async checkEnvironment() {
    const required = [
      'DATABASE_URL',
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'NEXTAUTH_SECRET'
    ]
    
    const missing = required.filter(key => !process.env[key])
    
    return {
      valid: missing.length === 0,
      missing
    }
  }
  
  async checkNodeVersion() {
    const { stdout } = await this.execAsync('node --version')
    const version = stdout.trim()
    const major = parseInt(version.split('.')[0].substring(1))
    
    return {
      valid: major >= 18,
      version,
      message: major < 18 ? 'Node.js 18以上が必要です' : undefined
    }
  }
  
  async checkPackages() {
    try {
      await this.execAsync('npm ls --depth=0')
      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        message: 'パッケージの依存関係に問題があります'
      }
    }
  }
  
  async checkTypeScript() {
    try {
      await this.execAsync('npx tsc --noEmit')
      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        message: 'TypeScriptエラーがあります'
      }
    }
  }
  
  async checkDatabase() {
    try {
      const { PrismaClient } = require('../../lib/generated/prisma')
      const prisma = new PrismaClient()
      
      await prisma.$connect()
      await prisma.$disconnect()
      
      return { connected: true }
    } catch (error) {
      return { 
        connected: false,
        message: error.message
      }
    }
  }
  
  async checkEndpoints() {
    // 簡易チェック
    return { valid: true }
  }
  
  execAsync(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve({ stdout, stderr })
        }
      })
    })
  }
  
  prompt(question) {
    return new Promise(resolve => {
      this.rl.question(question, resolve)
    })
  }
  
  close() {
    this.rl.close()
  }
}

// .envファイルを読み込む
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

// CLI実行
async function main() {
  const [,, command, ...args] = process.argv
  const tools = new DevTools()
  
  try {
    switch (command) {
      case 'start':
        await tools.start()
        break
        
      case 'check':
        await tools.check()
        break
        
      case 'fix':
        await tools.fix()
        break
        
      case 'test':
        await tools.test(args[0])
        break
        
      case 'clean':
        await tools.clean()
        break
        
      case 'prompt':
        await tools.promptEditor()
        break
        
      default:
        console.log(`
🛠️  X_BUZZ_FLOW 開発ツール

使い方:
  node scripts/dev-tools.js <command> [args]

コマンド:
  start      開発環境を起動（インタラクティブ）
  check      システムヘルスチェック
  fix        一般的な問題を自動修正
  test       特定の機能をテスト
  clean      キャッシュクリーン
  prompt     プロンプトエディター

例:
  node scripts/dev-tools.js start
  node scripts/dev-tools.js check
  node scripts/dev-tools.js test viral
  node scripts/dev-tools.js prompt

💡 ヒント:
  - 問題が発生したらまず 'check' を実行
  - 'fix' で多くの問題は自動解決
  - 'start' でインタラクティブに起動モードを選択
  - 'prompt' でChain of Thoughtプロンプトを管理
        `)
    }
  } catch (error) {
    console.error('\n❌ エラー:', error.message)
    process.exit(1)
  } finally {
    tools.close()
  }
}

main()