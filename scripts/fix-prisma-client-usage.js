#!/usr/bin/env node

/**
 * Prismaクライアントの使用方法を修正
 * viralDrafts → viral_drafts
 */

const fs = require('fs').promises;
const path = require('path');

// 更新対象のファイルパターン
const targetPatterns = [
  '**/*.js',
  '**/*.ts',
  '**/*.tsx'
];

// 除外するディレクトリ
const excludeDirs = [
  'node_modules',
  '.next',
  'lib/generated',
  '.git'
];

// 置換パターン
const replacements = [
  // Prismaクライアントでの使用（誤って更新されたもの）
  { from: /prisma\.viralDrafts/g, to: 'prisma.viral_drafts' },
  { from: /tx\.viralDrafts/g, to: 'tx.viral_drafts' },
];

async function findFiles(dir = '.') {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
      files.push(...await findFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      // 更新スクリプト自身は除外
      if (!fullPath.includes('fix-prisma-client-usage.js')) {
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
  console.log('🔍 Prismaクライアントの使用方法を検索中...\n');
  
  // ファイルを検索
  const files = await findFiles();
  console.log(`📁 ${files.length}個のファイルをチェックします\n`);
  
  let updatedCount = 0;
  
  for (const file of files) {
    const updated = await updateFile(file);
    if (updated) updatedCount++;
  }
  
  console.log(`\n✨ 完了: ${updatedCount}個のファイルを更新しました`);
}

// 実行
main().catch(console.error);