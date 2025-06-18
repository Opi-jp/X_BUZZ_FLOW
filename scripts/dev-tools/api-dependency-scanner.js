#!/usr/bin/env node

/**
 * API依存関係スキャナー
 * 
 * フロントエンド → API → DB の依存関係を自動検出
 * 
 * 使い方:
 * node scripts/dev-tools/api-dependency-scanner.js
 * node scripts/dev-tools/api-dependency-scanner.js --json  # JSON形式で出力
 * node scripts/dev-tools/api-dependency-scanner.js --unused  # 未使用APIのみ表示
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

class APIDependencyScanner {
  constructor() {
    this.dependencies = {
      frontendToApi: {},      // ページ → API
      apiToDb: {},           // API → DBテーブル
      apiToApi: {},          // API → API
      allApis: new Set(),    // 全APIエンドポイント
      usedApis: new Set(),   // 使用されているAPI
    };
  }

  // フロントエンドファイルからAPI呼び出しを抽出
  async scanFrontendFiles() {
    console.log('📱 フロントエンドファイルをスキャン中...');
    
    const files = glob.sync('app/**/*.{tsx,ts}', {
      ignore: ['**/node_modules/**', '**/.next/**']
    });

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const apiCalls = this.extractAPICalls(content);
      
      if (apiCalls.length > 0) {
        this.dependencies.frontendToApi[file] = apiCalls;
        apiCalls.forEach(api => this.dependencies.usedApis.add(api));
      }
    }
  }

  // APIファイルからDB依存を抽出
  async scanAPIFiles() {
    console.log('🔌 APIファイルをスキャン中...');
    
    const files = glob.sync('app/api/**/route.{ts,js}');
    
    for (const file of files) {
      // APIパスを構築
      const apiPath = this.fileToAPIPath(file);
      this.dependencies.allApis.add(apiPath);
      
      const content = await fs.readFile(file, 'utf-8');
      
      // Prismaモデルを抽出
      const dbTables = this.extractDBTables(content);
      if (dbTables.length > 0) {
        this.dependencies.apiToDb[apiPath] = dbTables;
      }
      
      // 他のAPI呼び出しを抽出
      const apiCalls = this.extractAPICalls(content);
      if (apiCalls.length > 0) {
        this.dependencies.apiToApi[apiPath] = apiCalls;
        apiCalls.forEach(api => this.dependencies.usedApis.add(api));
      }
    }
  }

  // fetch/axios呼び出しからAPIパスを抽出
  extractAPICalls(content) {
    const apis = [];
    
    // fetch呼び出し
    const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+api\/[^'"`]+)['"`]/g;
    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
      apis.push(match[1]);
    }
    
    // axios呼び出し
    const axiosRegex = /axios\.[a-z]+\s*\(\s*['"`]([^'"`]+api\/[^'"`]+)['"`]/g;
    while ((match = axiosRegex.exec(content)) !== null) {
      apis.push(match[1]);
    }
    
    // 動的パス（テンプレートリテラル）
    const templateRegex = /fetch\s*\(\s*`([^`]*api\/[^`]+)`/g;
    while ((match = templateRegex.exec(content)) !== null) {
      // ${id} を [id] に変換
      const path = match[1].replace(/\$\{[^}]+\}/g, '[id]');
      apis.push(path);
    }
    
    return [...new Set(apis)];
  }

  // PrismaモデルからDBテーブルを抽出
  extractDBTables(content) {
    const tables = [];
    
    // prisma.modelName パターン
    const prismaRegex = /prisma\.([a-zA-Z]+)\./g;
    let match;
    while ((match = prismaRegex.exec(content)) !== null) {
      if (match[1] !== 'Prisma' && match[1] !== '$') {
        tables.push(match[1]);
      }
    }
    
    return [...new Set(tables)];
  }

  // ファイルパスからAPIパスに変換
  fileToAPIPath(filePath) {
    // app/api/viral/cot-session/[sessionId]/route.ts → /api/viral/cot-session/[sessionId]
    return filePath
      .replace('app', '')
      .replace('/route.ts', '')
      .replace('/route.js', '');
  }

  // 未使用APIを検出
  findUnusedAPIs() {
    const unused = [];
    for (const api of this.dependencies.allApis) {
      if (!this.dependencies.usedApis.has(api)) {
        unused.push(api);
      }
    }
    return unused;
  }

  // 重複エンドポイントを検出
  findDuplicateAPIs() {
    const duplicates = {};
    
    // 機能名でグループ化
    const grouped = {};
    for (const api of this.dependencies.allApis) {
      // 最後のパス部分を機能名として使用
      const parts = api.split('/');
      const funcName = parts[parts.length - 1].replace('[id]', '').replace('[sessionId]', '');
      
      if (!grouped[funcName]) {
        grouped[funcName] = [];
      }
      grouped[funcName].push(api);
    }
    
    // 複数のパスを持つ機能を抽出
    for (const [func, apis] of Object.entries(grouped)) {
      if (apis.length > 1) {
        duplicates[func] = apis;
      }
    }
    
    return duplicates;
  }

  // レポート生成
  generateReport(options = {}) {
    console.log('\n📊 API依存関係レポート\n');
    console.log('=' .repeat(60));
    
    // 統計情報
    console.log('\n📈 統計情報:');
    console.log(`  総APIエンドポイント数: ${this.dependencies.allApis.size}`);
    console.log(`  使用中のAPI数: ${this.dependencies.usedApis.size}`);
    console.log(`  未使用のAPI数: ${this.dependencies.allApis.size - this.dependencies.usedApis.size}`);
    
    // 未使用API
    if (options.unused || !options.json) {
      const unused = this.findUnusedAPIs();
      if (unused.length > 0) {
        console.log('\n⚠️  未使用のAPIエンドポイント:');
        unused.forEach(api => console.log(`  - ${api}`));
      }
    }
    
    // 重複エンドポイント
    const duplicates = this.findDuplicateAPIs();
    if (Object.keys(duplicates).length > 0) {
      console.log('\n🔄 重複している可能性があるエンドポイント:');
      for (const [func, apis] of Object.entries(duplicates)) {
        console.log(`  ${func}:`);
        apis.forEach(api => console.log(`    - ${api}`));
      }
    }
    
    // フロントエンド → API
    if (!options.unused && !options.json) {
      console.log('\n🖥️  フロントエンド → API 依存関係:');
      for (const [page, apis] of Object.entries(this.dependencies.frontendToApi)) {
        console.log(`  ${page}:`);
        apis.forEach(api => console.log(`    → ${api}`));
      }
    }
    
    // API → DB
    if (!options.unused && !options.json) {
      console.log('\n💾 API → データベース 依存関係:');
      for (const [api, tables] of Object.entries(this.dependencies.apiToDb)) {
        console.log(`  ${api}:`);
        tables.forEach(table => console.log(`    → ${table}`));
      }
    }
    
    // JSON出力
    if (options.json) {
      console.log('\n📄 JSON形式の依存関係:');
      console.log(JSON.stringify({
        statistics: {
          totalApis: this.dependencies.allApis.size,
          usedApis: this.dependencies.usedApis.size,
          unusedApis: this.dependencies.allApis.size - this.dependencies.usedApis.size
        },
        unusedApis: this.findUnusedAPIs(),
        duplicates: duplicates,
        dependencies: this.dependencies
      }, null, 2));
    }
  }

  async run() {
    try {
      await this.scanFrontendFiles();
      await this.scanAPIFiles();
      
      const args = process.argv.slice(2);
      const options = {
        json: args.includes('--json'),
        unused: args.includes('--unused')
      };
      
      this.generateReport(options);
      
    } catch (error) {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    }
  }
}

// 実行
const scanner = new APIDependencyScanner();
scanner.run();