#!/usr/bin/env node

/**
 * viral_drafts_v2 を viral_drafts にリネーム
 * V2を取り除いてクリーンな名前にする
 */

const { PrismaClient } = require('../lib/generated/prisma');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log(chalk.bold.blue('\n🔄 viral_drafts_v2 → viral_drafts リネーム作業\n'));

  try {
    // 1. 現在のテーブル状況を確認
    console.log(chalk.yellow('1️⃣ 現在のテーブル状況を確認...'));
    
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'viral_drafts_v2'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log(chalk.red('❌ viral_drafts_v2 テーブルが存在しません'));
      return;
    }
    
    const newTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'viral_drafts'
      );
    `;
    
    if (newTableExists[0].exists) {
      console.log(chalk.red('❌ viral_drafts テーブルが既に存在します'));
      return;
    }
    
    console.log(chalk.green('✅ テーブル状況確認完了'));

    // 2. テーブル名を変更
    console.log(chalk.yellow('\n2️⃣ テーブル名を変更...'));
    
    await prisma.$executeRaw`ALTER TABLE "viral_drafts_v2" RENAME TO "viral_drafts";`;
    console.log(chalk.green('✅ テーブル名変更完了'));

    // 3. インデックスをリネーム
    console.log(chalk.yellow('\n3️⃣ インデックスをリネーム...'));
    
    const indexes = [
      ['idx_viral_drafts_v2_scheduled_at', 'idx_viral_drafts_scheduled_at'],
      ['idx_viral_drafts_v2_session_id', 'idx_viral_drafts_session_id'],
      ['idx_viral_drafts_v2_status', 'idx_viral_drafts_status']
    ];
    
    for (const [oldName, newName] of indexes) {
      try {
        await prisma.$executeRaw`ALTER INDEX ${oldName} RENAME TO ${newName};`;
        console.log(chalk.green(`  ✅ ${oldName} → ${newName}`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠️  ${oldName} のリネームをスキップ`));
      }
    }

    // 4. 外部キー制約の確認
    console.log(chalk.yellow('\n4️⃣ 外部キー制約を確認...'));
    
    const constraints = await prisma.$queryRaw`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'viral_drafts'::regclass 
      AND contype = 'f';
    `;
    
    console.log(chalk.green(`  ✅ ${constraints.length}個の外部キー制約を確認`));

    // 5. schema.prismaの更新指示
    console.log(chalk.yellow('\n5️⃣ 次のステップ:'));
    console.log(chalk.cyan('  1. prisma/schema.prismaを手動で更新:'));
    console.log(chalk.gray('     - model viral_drafts_v2 → model viral_drafts'));
    console.log(chalk.gray('     - @@index名の更新'));
    console.log(chalk.cyan('  2. npx prisma generate を実行'));
    console.log(chalk.cyan('  3. schema-sync-manager.tsの更新'));
    console.log(chalk.cyan('  4. すべてのコードでviral_drafts_v2をviral_draftsに置換'));

    // 6. 影響するファイルのリスト作成
    console.log(chalk.yellow('\n6️⃣ 影響するファイルを検索...'));
    
    const filesToUpdate = [];
    const searchDirs = ['app', 'lib', 'scripts'];
    
    for (const dir of searchDirs) {
      await findFilesWithPattern(path.join(process.cwd(), dir), 'viral_drafts_v2', filesToUpdate);
    }
    
    console.log(chalk.cyan(`\n📄 更新が必要なファイル: ${filesToUpdate.length}個`));
    
    // ファイルリストを保存
    await fs.writeFile(
      'viral-drafts-rename-files.txt',
      filesToUpdate.join('\n'),
      'utf-8'
    );
    console.log(chalk.green('✅ ファイルリストを viral-drafts-rename-files.txt に保存'));

  } catch (error) {
    console.error(chalk.red('\n❌ エラー:'), error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

async function findFilesWithPattern(dir, pattern, results) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await findFilesWithPattern(fullPath, pattern, results);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
        const content = await fs.readFile(fullPath, 'utf-8');
        if (content.includes(pattern)) {
          results.push(fullPath.replace(process.cwd() + '/', ''));
        }
      }
    }
  } catch (error) {
    // ディレクトリアクセスエラーは無視
  }
}

main();