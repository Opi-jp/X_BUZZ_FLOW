#!/usr/bin/env node

/**
 * viral_drafts_v2 → viral_drafts への最終的な参照更新
 * 
 * このスクリプトは、残っているviral_drafts_v2への参照を
 * 正しいPrismaクライアントの形式（viralDrafts）に更新します
 */

const fs = require('fs').promises;
const path = require('path');

// 更新対象のファイルパターン
const targetPatterns = [
  'test-*.js',
  'scripts/test-*.js',
  'scripts/dev-tools/*.js'
];

// 除外するファイル
const excludeFiles = [
  'scripts/rename-viral-drafts-v2.js',
  'scripts/update-viral-drafts-references.js',
  'scripts/update-viral-drafts-final.js'
];

// 置換パターン
const replacements = [
  // Prismaクライアントでの使用
  { from: /prisma\.viral_drafts_v2/g, to: 'prisma.viral_drafts' },
  { from: /tx\.viral_drafts_v2/g, to: 'tx.viral_drafts' },
  
  // 文字列内での参照（ログメッセージなど）
  { from: /'viral_drafts_v2'/g, to: "'viral_drafts'" },
  { from: /"viral_drafts_v2"/g, to: '"viral_drafts"' },
  { from: /`viral_drafts_v2`/g, to: '`viral_drafts`' },
  
  // モデル名での参照
  { from: /ViralDraftV2/g, to: 'ViralDraft' },
  { from: /viralDraftV2/g, to: 'viralDraft' }
];

async function findFiles(pattern, dir = '.') {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...await findFiles(pattern, fullPath));
    } else if (entry.isFile()) {
      // パターンマッチング
      const fileName = entry.name;
      const shouldInclude = targetPatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(fullPath);
        }
        return fullPath.includes(pattern);
      });
      
      const shouldExclude = excludeFiles.some(exclude => fullPath.includes(exclude));
      
      if (shouldInclude && !shouldExclude) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function updateFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;
    
    // 各置換パターンを適用
    for (const { from, to } of replacements) {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    }
    
    if (modified) {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`✅ 更新: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ エラー: ${filePath} - ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 viral_drafts_v2への参照を検索中...\n');
  
  // ファイルを検索
  const files = await findFiles();
  console.log(`📁 ${files.length}個のファイルをチェックします\n`);
  
  let updatedCount = 0;
  
  for (const file of files) {
    const updated = await updateFile(file);
    if (updated) updatedCount++;
  }
  
  console.log(`\n✨ 完了: ${updatedCount}個のファイルを更新しました`);
  
  // ドキュメントの更新についての注意
  if (updatedCount > 0) {
    console.log('\n📝 注意: ドキュメントファイル（.md）は手動で更新することを推奨します');
    console.log('   - docs/current/source-tree-implementation-plan-20250621.md');
    console.log('   - ERRORS.md');
    console.log('   - CLAUDE.md の作業記録');
  }
}

// 実行
main().catch(console.error);