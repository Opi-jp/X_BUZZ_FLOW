#!/usr/bin/env node

const { PrismaClient } = require('../app/generated/prisma');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// カラーコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function showMenu() {
  console.log(`\n${colors.cyan}=== X_BUZZ_FLOW データベース管理ツール ===${colors.reset}`);
  console.log('1. テーブル一覧を表示');
  console.log('2. usersテーブルを確認');
  console.log('3. CoTセッション一覧');
  console.log('4. SQLを実行（fix-users-table.sql）');
  console.log('5. カスタムSQLを実行');
  console.log('6. データベース統計情報');
  console.log('7. エラーセッションをリセット');
  console.log('8. 終了');
  
  const choice = await question('\n選択してください (1-8): ');
  return choice;
}

async function listTables() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log(`\n${colors.green}テーブル一覧:${colors.reset}`);
    result.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
  }
}

async function checkUsersTable() {
  try {
    // カラム情報を取得
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    
    console.log(`\n${colors.green}usersテーブルのカラム:${colors.reset}`);
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // レコード数を取得
    const count = await prisma.user.count();
    console.log(`\n${colors.blue}レコード数: ${count}${colors.reset}`);
    
    // createdAtカラムの存在確認
    const hasCreatedAt = columns.some(col => col.column_name === 'createdAt');
    const hasUpdatedAt = columns.some(col => col.column_name === 'updatedAt');
    
    if (!hasCreatedAt || !hasUpdatedAt) {
      console.log(`\n${colors.yellow}⚠️  警告: createdAt/updatedAtカラムが存在しません${colors.reset}`);
      console.log('fix-users-table.sqlを実行してください（メニュー4番）');
    }
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
  }
}

async function listCotSessions() {
  try {
    const sessions = await prisma.cotSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        currentPhase: true,
        currentStep: true,
        retryCount: true,
        lastError: true,
        expertise: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`\n${colors.green}最新のCoTセッション:${colors.reset}`);
    sessions.forEach(session => {
      const statusColor = session.status === 'COMPLETED' ? colors.green : 
                         session.status === 'FAILED' ? colors.red : 
                         colors.yellow;
      console.log(`\n  ID: ${session.id}`);
      console.log(`  状態: ${statusColor}${session.status}${colors.reset}`);
      console.log(`  フェーズ: ${session.currentPhase} - ${session.currentStep}`);
      console.log(`  テーマ: ${session.expertise}`);
      console.log(`  作成: ${session.createdAt.toLocaleString('ja-JP')}`);
      if (session.lastError) {
        console.log(`  エラー: ${colors.red}${session.lastError.substring(0, 50)}...${colors.reset}`);
      }
    });
    
    // 統計情報
    const stats = await prisma.cotSession.groupBy({
      by: ['status'],
      _count: true
    });
    
    console.log(`\n${colors.blue}統計:${colors.reset}`);
    stats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat._count}件`);
    });
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
  }
}

async function executeSqlFile() {
  try {
    const sqlPath = path.resolve(__dirname, '../fix-users-table.sql');
    if (!fs.existsSync(sqlPath)) {
      console.log(`${colors.red}fix-users-table.sqlが見つかりません${colors.reset}`);
      return;
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(`\n${colors.yellow}実行するSQL:${colors.reset}`);
    console.log(sqlContent.substring(0, 200) + '...');
    
    const confirm = await question('\n実行しますか？ (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('キャンセルしました');
      return;
    }
    
    // SQLを個別のステートメントに分割
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        console.log(`\n実行中: ${statement.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(statement);
        console.log(`${colors.green}✓ 成功${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}✗ エラー: ${error.message}${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.green}SQLの実行が完了しました${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
  }
}

async function executeCustomSql() {
  console.log(`\n${colors.yellow}カスタムSQL実行（終了するには 'exit' と入力）${colors.reset}`);
  
  while (true) {
    const sql = await question('\nSQL> ');
    
    if (sql.toLowerCase() === 'exit') {
      break;
    }
    
    if (!sql.trim()) {
      continue;
    }
    
    try {
      // SELECTクエリかどうか判定
      if (sql.trim().toLowerCase().startsWith('select')) {
        const result = await prisma.$queryRawUnsafe(sql);
        console.table(result);
      } else {
        const result = await prisma.$executeRawUnsafe(sql);
        console.log(`${colors.green}実行完了: ${result} 行が影響を受けました${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
    }
  }
}

async function showDatabaseStats() {
  try {
    console.log(`\n${colors.cyan}=== データベース統計情報 ===${colors.reset}`);
    
    // 各テーブルのレコード数
    const tables = [
      { name: 'users', count: await prisma.user.count() },
      { name: 'cotSessions', count: await prisma.cotSession.count() },
      { name: 'cotPhases', count: await prisma.cotPhase.count() },
      { name: 'cotDrafts', count: await prisma.cotDraft.count() },
      { name: 'buzzPosts', count: await prisma.buzzPost.count() },
      { name: 'newsItems', count: await prisma.newsItem.count() },
    ];
    
    console.log(`\n${colors.green}テーブル別レコード数:${colors.reset}`);
    tables.forEach(table => {
      console.log(`  ${table.name}: ${table.count.toLocaleString()} 件`);
    });
    
    // ディスク使用量（概算）
    const diskUsage = await prisma.$queryRaw`
      SELECT 
        pg_database_size(current_database()) as db_size,
        pg_size_pretty(pg_database_size(current_database())) as db_size_pretty
    `;
    
    console.log(`\n${colors.green}データベースサイズ:${colors.reset}`);
    console.log(`  ${diskUsage[0].db_size_pretty}`);
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
  }
}

async function resetErrorSessions() {
  try {
    const errorSessions = await prisma.cotSession.findMany({
      where: {
        OR: [
          { status: 'FAILED' },
          { retryCount: { gte: 5 } }
        ]
      },
      select: {
        id: true,
        status: true,
        retryCount: true,
        expertise: true,
        lastError: true
      }
    });
    
    if (errorSessions.length === 0) {
      console.log(`${colors.green}エラーセッションはありません${colors.reset}`);
      return;
    }
    
    console.log(`\n${colors.yellow}エラーセッション一覧:${colors.reset}`);
    errorSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. ID: ${session.id}`);
      console.log(`   状態: ${session.status} (再試行: ${session.retryCount}回)`);
      console.log(`   テーマ: ${session.expertise}`);
      console.log(`   エラー: ${session.lastError?.substring(0, 50)}...`);
    });
    
    const choice = await question('\nリセットするセッション番号を選択 (0で全て、-1でキャンセル): ');
    
    if (choice === '-1') {
      console.log('キャンセルしました');
      return;
    }
    
    const sessionsToReset = choice === '0' ? errorSessions : [errorSessions[parseInt(choice) - 1]];
    
    if (!sessionsToReset[0]) {
      console.log(`${colors.red}無効な選択です${colors.reset}`);
      return;
    }
    
    for (const session of sessionsToReset) {
      await prisma.cotSession.update({
        where: { id: session.id },
        data: {
          status: 'PENDING',
          retryCount: 0,
          lastError: null,
          nextRetryAt: null
        }
      });
      console.log(`${colors.green}✓ リセット完了: ${session.id}${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.cyan}X_BUZZ_FLOW データベース管理ツール${colors.reset}`);
  console.log(`接続先: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'}`);
  
  while (true) {
    const choice = await showMenu();
    
    switch (choice) {
      case '1':
        await listTables();
        break;
      case '2':
        await checkUsersTable();
        break;
      case '3':
        await listCotSessions();
        break;
      case '4':
        await executeSqlFile();
        break;
      case '5':
        await executeCustomSql();
        break;
      case '6':
        await showDatabaseStats();
        break;
      case '7':
        await resetErrorSessions();
        break;
      case '8':
        console.log('\n終了します');
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
      default:
        console.log(`${colors.red}無効な選択です${colors.reset}`);
    }
    
    await question('\nEnterキーを押して続行...');
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}エラー:`, error, colors.reset);
  prisma.$disconnect();
  process.exit(1);
});

// 実行
main().catch(async (error) => {
  console.error(`${colors.red}エラー:`, error, colors.reset);
  await prisma.$disconnect();
  process.exit(1);
});