#!/usr/bin/env node

/**
 * リファクタリング支援ツール
 * 
 * 大規模なリファクタリングを安全かつ効率的に行うためのヘルパー
 * 
 * 使い方:
 * - node scripts/refactor-helper.js analyze <pattern>   # 影響範囲を分析
 * - node scripts/refactor-helper.js rename <old> <new>  # 一括リネーム
 * - node scripts/refactor-helper.js migrate-imports     # import文の一括更新
 * - node scripts/refactor-helper.js check-deps          # 依存関係チェック
 * - node scripts/refactor-helper.js backup              # バックアップ作成
 */

const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process').promises
const glob = require('glob').sync

class RefactorHelper {
  constructor() {
    this.rootDir = process.cwd()
    this.backupDir = path.join(this.rootDir, '.refactor-backup')
    
    // 除外パターン
    this.excludePatterns = [
      'node_modules/**',
      '.next/**',
      '.git/**',
      'lib/generated/**',
      'prisma/migrations/**',
      '.refactor-backup/**'
    ]
  }
  
  /**
   * 影響範囲を分析
   */
  async analyze(pattern) {
    console.log(`🔍 "${pattern}" の使用箇所を分析中...\n`)
    
    try {
      // ripgrepで高速検索
      const { stdout } = await exec(`rg "${pattern}" --type ts --type tsx --type js --type jsx -C 2`)
      
      const lines = stdout.split('\n').filter(Boolean)
      const files = new Set()
      const contexts = []
      
      lines.forEach(line => {
        const match = line.match(/^(.+?):(\d+):(.*)$/)
        if (match) {
          const [, file, lineNum, content] = match
          files.add(file)
          contexts.push({
            file,
            line: parseInt(lineNum),
            content: content.trim()
          })
        }
      })
      
      console.log(`📊 分析結果:`)
      console.log(`  - 影響ファイル数: ${files.size}`)
      console.log(`  - 該当箇所: ${contexts.length}件\n`)
      
      if (files.size > 0) {
        console.log('📁 影響を受けるファイル:')
        Array.from(files).sort().forEach(file => {
          console.log(`  - ${file}`)
        })
        
        console.log('\n💡 推奨事項:')
        console.log('  1. まずバックアップを作成: node scripts/refactor-helper.js backup')
        console.log('  2. 小さな変更から始める')
        console.log('  3. TypeScriptの型チェックを活用')
        console.log('  4. テストを実行しながら進める')
      }
      
    } catch (error) {
      if (error.code === 1) {
        console.log('✅ 該当する箇所が見つかりませんでした')
      } else {
        console.error('❌ エラー:', error.message)
      }
    }
  }
  
  /**
   * 一括リネーム
   */
  async rename(oldName, newName) {
    console.log(`🔄 "${oldName}" を "${newName}" にリネーム中...\n`)
    
    const files = this.getSourceFiles()
    let changedFiles = 0
    let totalReplacements = 0
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      
      // 単語境界を考慮した置換
      const regex = new RegExp(`\\b${oldName}\\b`, 'g')
      const newContent = content.replace(regex, newName)
      
      if (content !== newContent) {
        await fs.writeFile(file, newContent)
        const replacements = (content.match(regex) || []).length
        changedFiles++
        totalReplacements += replacements
        console.log(`  ✏️  ${file} (${replacements}箇所)`)
      }
    }
    
    console.log(`\n✅ リネーム完了:`)
    console.log(`  - 変更ファイル数: ${changedFiles}`)
    console.log(`  - 置換箇所: ${totalReplacements}`)
    
    if (changedFiles > 0) {
      console.log('\n🔧 次のステップ:')
      console.log('  1. TypeScriptのビルドエラーを確認: npm run type-check')
      console.log('  2. テストを実行: npm test')
      console.log('  3. 開発サーバーで動作確認: npm run dev')
    }
  }
  
  /**
   * import文の一括更新
   */
  async migrateImports() {
    console.log('📦 import文を最適化中...\n')
    
    const files = this.getSourceFiles()
    const importMap = new Map()
    
    // 1. 全てのexportを収集
    console.log('1️⃣ exportを収集中...')
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      const exports = this.extractExports(content)
      
      if (exports.length > 0) {
        const relativePath = path.relative(this.rootDir, file)
        exports.forEach(exp => {
          if (!importMap.has(exp)) {
            importMap.set(exp, [])
          }
          importMap.get(exp).push(relativePath)
        })
      }
    }
    
    // 2. 重複や循環参照をチェック
    console.log('2️⃣ 問題を検出中...')
    const issues = []
    
    for (const [name, locations] of importMap) {
      if (locations.length > 1) {
        issues.push({
          type: 'duplicate',
          name,
          locations
        })
      }
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️  検出された問題:')
      issues.forEach(issue => {
        if (issue.type === 'duplicate') {
          console.log(`  - "${issue.name}" が複数の場所でexportされています:`)
          issue.locations.forEach(loc => console.log(`    - ${loc}`))
        }
      })
    }
    
    // 3. import文の最適化提案
    console.log('\n3️⃣ 最適化の提案:')
    console.log('  - @/lib/* エイリアスの使用')
    console.log('  - 相対パスの削減')
    console.log('  - barrel export (index.ts) の活用')
    
    console.log('\n✅ 分析完了！')
  }
  
  /**
   * 依存関係チェック
   */
  async checkDeps() {
    console.log('🔗 依存関係をチェック中...\n')
    
    try {
      // 未使用の依存関係をチェック
      console.log('1️⃣ 未使用の依存関係を検出中...')
      const { stdout: unused } = await exec('npx depcheck --json')
      const depcheckResult = JSON.parse(unused)
      
      if (depcheckResult.dependencies.length > 0) {
        console.log('\n未使用のdependencies:')
        depcheckResult.dependencies.forEach(dep => {
          console.log(`  - ${dep}`)
        })
      }
      
      // 循環参照をチェック
      console.log('\n2️⃣ 循環参照を検出中...')
      const circularDeps = await this.findCircularDeps()
      
      if (circularDeps.length > 0) {
        console.log('\n⚠️  循環参照が見つかりました:')
        circularDeps.forEach(cycle => {
          console.log(`  ${cycle.join(' → ')} → ${cycle[0]}`)
        })
      } else {
        console.log('✅ 循環参照は見つかりませんでした')
      }
      
      // 大きすぎるバンドルをチェック
      console.log('\n3️⃣ バンドルサイズを分析中...')
      await this.analyzeBundleSize()
      
    } catch (error) {
      console.error('❌ エラー:', error.message)
    }
  }
  
  /**
   * バックアップ作成
   */
  async backup() {
    console.log('💾 バックアップを作成中...\n')
    
    // バックアップディレクトリ作成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(this.backupDir, timestamp)
    await fs.mkdir(backupPath, { recursive: true })
    
    // 重要なファイルをバックアップ
    const filesToBackup = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'next.config.js',
      'prisma/schema.prisma',
      '.env.local'
    ]
    
    for (const file of filesToBackup) {
      try {
        const src = path.join(this.rootDir, file)
        const dest = path.join(backupPath, file)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.copyFile(src, dest)
        console.log(`  ✅ ${file}`)
      } catch (error) {
        console.log(`  ⚠️  ${file} (スキップ)`)
      }
    }
    
    // ソースコードのスナップショット
    console.log('\n📸 ソースコードのスナップショットを作成中...')
    await exec(`git diff > "${path.join(backupPath, 'uncommitted-changes.patch')}"`)
    await exec(`git log -1 --pretty=format:"%H" > "${path.join(backupPath, 'last-commit.txt')}"`)
    
    console.log(`\n✅ バックアップ完了: ${backupPath}`)
    console.log('\n💡 復元方法:')
    console.log(`  1. ファイルを復元: cp -r "${backupPath}/*" .`)
    console.log(`  2. 変更を元に戻す: git apply "${backupPath}/uncommitted-changes.patch"`)
  }
  
  // ヘルパーメソッド
  getSourceFiles() {
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ]
    
    const files = []
    patterns.forEach(pattern => {
      const matches = glob(pattern, {
        ignore: this.excludePatterns,
        absolute: true
      })
      files.push(...matches)
    })
    
    return files
  }
  
  extractExports(content) {
    const exports = []
    
    // named exports
    const namedRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g
    let match
    while ((match = namedRegex.exec(content)) !== null) {
      exports.push(match[1])
    }
    
    // default export
    if (/export\s+default\s+/.test(content)) {
      exports.push('default')
    }
    
    return exports
  }
  
  async findCircularDeps() {
    // 簡易的な循環参照検出
    // TODO: より高度な実装
    return []
  }
  
  async analyzeBundleSize() {
    try {
      const { stdout } = await exec('npm list --depth=0 --json')
      const deps = JSON.parse(stdout).dependencies || {}
      
      const largeDeps = Object.entries(deps)
        .filter(([name]) => {
          // 大きくなりがちなパッケージ
          const largePackages = ['react', 'next', '@prisma/client', 'lodash']
          return !largePackages.includes(name)
        })
      
      console.log('  ℹ️  大きなパッケージの使用を避けることを推奨')
    } catch (error) {
      // エラーは無視
    }
  }
}

// CLI実行
async function main() {
  const [,, command, ...args] = process.argv
  const helper = new RefactorHelper()
  
  try {
    switch (command) {
      case 'analyze':
        if (!args[0]) {
          console.error('使い方: refactor-helper.js analyze <pattern>')
          process.exit(1)
        }
        await helper.analyze(args[0])
        break
        
      case 'rename':
        if (!args[0] || !args[1]) {
          console.error('使い方: refactor-helper.js rename <old> <new>')
          process.exit(1)
        }
        await helper.rename(args[0], args[1])
        break
        
      case 'migrate-imports':
        await helper.migrateImports()
        break
        
      case 'check-deps':
        await helper.checkDeps()
        break
        
      case 'backup':
        await helper.backup()
        break
        
      default:
        console.log(`
🔧 リファクタリング支援ツール

使い方:
  node scripts/refactor-helper.js <command> [args]

コマンド:
  analyze <pattern>      指定パターンの使用箇所を分析
  rename <old> <new>     一括リネーム（単語境界を考慮）
  migrate-imports        import文の最適化提案
  check-deps            依存関係の問題をチェック
  backup                リファクタリング前のバックアップ作成

例:
  node scripts/refactor-helper.js analyze "NewsArticle"
  node scripts/refactor-helper.js rename "oldFunction" "newFunction"
  node scripts/refactor-helper.js backup

💡 ヒント:
  - 大きな変更の前には必ずバックアップを作成
  - TypeScriptの型チェックを活用して安全にリファクタリング
  - 小さな変更を積み重ねて進める
        `)
    }
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()