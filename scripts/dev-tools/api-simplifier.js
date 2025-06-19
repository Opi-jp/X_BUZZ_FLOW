#!/usr/bin/env node

/**
 * API Simplifier - 複雑なAPIエンドポイントを整理・分析
 * 
 * 目的：
 * 1. 重複するエンドポイントを発見
 * 2. 未使用のエンドポイントを特定
 * 3. 本当に必要な最小限のAPIセットを提案
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// CoTシステムで本当に必要なエンドポイント（最小限）
const ESSENTIAL_COT_ENDPOINTS = {
  'セッション管理': [
    'POST /api/generation/content/session/create',
    'GET  /api/generation/content/sessions/[id]',
    'POST /api/generation/content/sessions/[id]/collect',
    'POST /api/generation/content/sessions/[id]/generate-concepts', 
    'POST /api/generation/content/sessions/[id]/integrate'
  ],
  '下書き管理': [
    'GET  /api/generation/drafts',
    'GET  /api/generation/drafts/[id]',
    'PUT  /api/generation/drafts/[id]',
    'POST /api/generation/drafts/[id]/post-now'
  ],
  'ニュース': [
    'GET  /api/intelligence/news/latest',
    'POST /api/intelligence/news/analyze'
  ]
};

// 明らかに重複している/古いパターン
const DEPRECATED_PATTERNS = [
  /\/api\/viral\/v2\//,              // 旧V2システム
  /\/api\/generation\/content\/session\/\[sessionId\]\//,  // sessionId版（idに統一）
  /\/api\/debug\//,                  // デバッグ用
  /\/api\/test\//,                   // テスト用
  /mock/,                            // モック
  /\-old/,                           // 明示的に古い
  /\-backup/,                        // バックアップ
];

function scanApiEndpoints() {
  const apiDir = path.join(process.cwd(), 'app/api');
  const endpoints = [];
  
  function scanDirectory(dir, prefix = '/api') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        const newPrefix = `${prefix}/${file}`;
        scanDirectory(filePath, newPrefix);
      } else if (file === 'route.ts' || file === 'route.js') {
        const content = fs.readFileSync(filePath, 'utf8');
        const methods = extractMethods(content);
        
        methods.forEach(method => {
          endpoints.push({
            method,
            path: prefix.replace(/\[([^\]]+)\]/g, '[id]'), // パラメータを統一
            file: filePath.replace(process.cwd(), ''),
            deprecated: isDeprecated(prefix),
            used: false // 後で使用状況を確認
          });
        });
      }
    });
  }
  
  scanDirectory(apiDir);
  return endpoints;
}

function extractMethods(content) {
  const methods = [];
  const methodPattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g;
  let match;
  
  while ((match = methodPattern.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  return methods;
}

function isDeprecated(path) {
  return DEPRECATED_PATTERNS.some(pattern => pattern.test(path));
}

function checkUsage(endpoints) {
  // フロントエンドコードをスキャンして使用状況を確認
  try {
    const searchDirs = ['app', 'components', 'lib'].filter(dir => fs.existsSync(dir));
    
    endpoints.forEach(endpoint => {
      // エンドポイントのパスから検索パターンを作成
      const searchPattern = endpoint.path
        .replace(/\[id\]/g, '.*')
        .replace(/\//g, '\\/')
        .replace(/^\/api/, '(\\/api)?'); // /apiプレフィックスはオプション
      
      try {
        const result = execSync(
          `grep -r -E "${searchPattern}" ${searchDirs.join(' ')} --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | head -1`,
          { encoding: 'utf8', stdio: 'pipe' }
        );
        
        if (result.trim()) {
          endpoint.used = true;
        }
      } catch (e) {
        // grep found nothing
      }
    });
  } catch (e) {
    console.error('Error checking usage:', e.message);
  }
}

function analyzeEndpoints(endpoints) {
  // 分析結果
  const analysis = {
    total: endpoints.length,
    deprecated: endpoints.filter(e => e.deprecated).length,
    used: endpoints.filter(e => e.used).length,
    unused: endpoints.filter(e => !e.used && !e.deprecated).length,
    byCategory: {},
    duplicates: findDuplicates(endpoints)
  };
  
  // カテゴリ別に分類
  endpoints.forEach(endpoint => {
    const category = getCategoryFromPath(endpoint.path);
    if (!analysis.byCategory[category]) {
      analysis.byCategory[category] = [];
    }
    analysis.byCategory[category].push(endpoint);
  });
  
  return analysis;
}

function getCategoryFromPath(path) {
  const parts = path.split('/').filter(p => p);
  if (parts.length >= 2) {
    return parts[1]; // /api/[category]/...
  }
  return 'root';
}

function findDuplicates(endpoints) {
  const duplicates = {};
  
  // 機能的に重複している可能性のあるエンドポイントを検出
  const patterns = [
    { pattern: /session.*create/, group: 'session-create' },
    { pattern: /collect.*topics?/, group: 'collect-topics' },
    { pattern: /generate.*concepts?/, group: 'generate-concepts' },
    { pattern: /draft.*post/, group: 'post-draft' },
  ];
  
  patterns.forEach(({ pattern, group }) => {
    const matches = endpoints.filter(e => pattern.test(e.path));
    if (matches.length > 1) {
      duplicates[group] = matches;
    }
  });
  
  return duplicates;
}

function displayReport(analysis) {
  console.log('\n📊 API Endpoint Analysis Report');
  console.log('================================\n');
  
  console.log('📈 Overview:');
  console.log(`   Total endpoints: ${analysis.total}`);
  console.log(`   Used: ${analysis.used} (${Math.round(analysis.used / analysis.total * 100)}%)`);
  console.log(`   Unused: ${analysis.unused} (${Math.round(analysis.unused / analysis.total * 100)}%)`);
  console.log(`   Deprecated: ${analysis.deprecated}\n`);
  
  console.log('📁 By Category:');
  Object.entries(analysis.byCategory).forEach(([category, endpoints]) => {
    const used = endpoints.filter(e => e.used).length;
    console.log(`   ${category}: ${endpoints.length} endpoints (${used} used)`);
  });
  
  console.log('\n⚠️  Potential Duplicates:');
  Object.entries(analysis.duplicates).forEach(([group, endpoints]) => {
    console.log(`   ${group}:`);
    endpoints.forEach(e => {
      console.log(`     - ${e.method} ${e.path} ${e.used ? '✅' : '❌'}`);
    });
  });
  
  console.log('\n🎯 Recommended Minimal API Set:');
  Object.entries(ESSENTIAL_COT_ENDPOINTS).forEach(([category, endpoints]) => {
    console.log(`   ${category}:`);
    endpoints.forEach(e => {
      console.log(`     - ${e}`);
    });
  });
  
  console.log('\n🗑️  Candidates for Removal:');
  const removalCandidates = analysis.byCategory.generation?.filter(e => 
    !e.used && !ESSENTIAL_COT_ENDPOINTS['セッション管理'].some(essential => 
      essential.includes(e.path.replace(/\[id\]/g, '[id]'))
    )
  ) || [];
  
  removalCandidates.slice(0, 10).forEach(e => {
    console.log(`   - ${e.method} ${e.path}`);
  });
  
  if (removalCandidates.length > 10) {
    console.log(`   ... and ${removalCandidates.length - 10} more`);
  }
}

// メイン実行
function main() {
  console.log('🔍 Scanning API endpoints...');
  const endpoints = scanApiEndpoints();
  
  console.log('📊 Checking usage...');
  checkUsage(endpoints);
  
  const analysis = analyzeEndpoints(endpoints);
  displayReport(analysis);
  
  // 簡易APIマップを生成
  console.log('\n📝 Generating simple API map...');
  const mapPath = path.join(process.cwd(), 'COT_API_MAP.md');
  generateApiMap(analysis, mapPath);
  console.log(`   Created: ${mapPath}`);
}

function generateApiMap(analysis, outputPath) {
  let content = '# CoT System API Map (Simplified)\n\n';
  content += '## 🎯 Essential APIs Only\n\n';
  
  Object.entries(ESSENTIAL_COT_ENDPOINTS).forEach(([category, endpoints]) => {
    content += `### ${category}\n\n`;
    endpoints.forEach(endpoint => {
      content += `- ${endpoint}\n`;
    });
    content += '\n';
  });
  
  content += '## ⚠️ DO NOT USE\n\n';
  content += '- Any `/api/viral/*` endpoints (deprecated)\n';
  content += '- Any `/api/debug/*` endpoints (development only)\n';
  content += '- Endpoints with `sessionId` instead of `id`\n';
  content += '- Any endpoint not listed above\n';
  
  fs.writeFileSync(outputPath, content);
}

main();