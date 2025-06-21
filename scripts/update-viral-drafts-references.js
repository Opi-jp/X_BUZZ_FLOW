#!/usr/bin/env node

/**
 * viral_drafts_v2 → viral_drafts の参照を自動更新
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

// 更新から除外するパターン
const excludePatterns = [
  /lib\/generated\//,  // 生成されたファイル
  /\.backup\./,        // バックアップファイル
  /scripts\/.*migration.*\.js/,  // 古いマイグレーションスクリプト
  /scripts\/rename-viral-drafts-v2\.js/  // このスクリプト自体
];

// 更新するファイル
const filesToUpdate = [
  'app/api/create/flow/[id]/generate/route.ts',
  'app/api/create/flow/[id]/process/route.ts',
  'app/api/create/flow/list/route.ts',
  'app/api/publish/post/now/route.ts',
  'lib/core/unified-system-manager.ts',
  'lib/twitter/enhanced-post-manager.ts',
  'lib/twitter/scheduled-post-enhancer.ts',
  'scripts/dev-tools/db-manager.js'
];

async function updateFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 置換パターン
    const replacements = [
      // Prismaクライアントでの使用
      [/\.viral_drafts_v2\b/g, '.viral_drafts'],
      [/prisma\.viralDraftsV2\b/g, 'prisma.viral_drafts'],
      [/viralDraftsV2\b/g, 'viralDrafts'],
      
      // 文字列リテラル
      [/'viral_drafts_v2'/g, "'viral_drafts'"],
      [/"viral_drafts_v2"/g, '"viral_drafts"'],
      
      // EntityType
      [/EntityType\.VIRAL_DRAFT_V2/g, 'EntityType.VIRAL_DRAFT'],
      
      // コメント内の参照も更新
      [/viral_drafts_v2/g, 'viral_drafts']
    ];
    
    let updatedContent = content;
    let changeCount = 0;
    
    for (const [pattern, replacement] of replacements) {
      const before = updatedContent;
      updatedContent = updatedContent.replace(pattern, replacement);
      if (before !== updatedContent) {
        changeCount += (before.match(pattern) || []).length;
      }
    }
    
    if (changeCount > 0) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      console.log(chalk.green(`  ✅ ${path.basename(filePath)} - ${changeCount}箇所を更新`));
      return true;
    } else {
      console.log(chalk.gray(`  - ${path.basename(filePath)} - 変更なし`));
      return false;
    }
  } catch (error) {
    console.error(chalk.red(`  ❌ ${filePath}: ${error.message}`));
    return false;
  }
}

async function main() {
  console.log(chalk.bold.blue('\n🔄 viral_drafts_v2 参照の更新\n'));
  
  let updatedCount = 0;
  let totalFiles = 0;
  
  for (const filePath of filesToUpdate) {
    const fullPath = path.join(process.cwd(), filePath);
    
    // 除外パターンをチェック
    if (excludePatterns.some(pattern => pattern.test(filePath))) {
      console.log(chalk.yellow(`  ⏭️  ${filePath} - スキップ`));
      continue;
    }
    
    totalFiles++;
    const updated = await updateFile(fullPath);
    if (updated) updatedCount++;
  }
  
  console.log(chalk.bold.green(`\n✅ 完了: ${updatedCount}/${totalFiles} ファイルを更新`));
  
  // unified-system-managerのEntityType定義も確認
  console.log(chalk.yellow('\n📌 手動で確認が必要な項目:'));
  console.log(chalk.gray('  1. lib/core/unified-system-manager.ts の EntityType enum'));
  console.log(chalk.gray('  2. テストスクリプトの更新'));
  console.log(chalk.gray('  3. フロントエンドコンポーネントの更新'));
}

main();