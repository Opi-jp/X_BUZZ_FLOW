#!/usr/bin/env node

/**
 * DBスキーマとPrismaスキーマの整合性をチェックするツール
 * DBとフロントエンドの定義の不一致を検出
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('../../lib/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

// チェック結果を格納
const validationResults = {
  passed: [],
  failed: [],
  warnings: []
};

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function validateSchema() {
  console.log(`${colors.cyan}=== DB Schema Validator ===${colors.reset}\n`);
  
  try {
    // 1. usersテーブルのチェック（Twitter認証で問題になった）
    await validateUsersTable();
    
    // 2. cot_sessionsテーブルのチェック（themeカラムの確認）
    await validateCotSessionsTable();
    
    // 3. api_tasksテーブルのチェック（非同期処理）
    await validateApiTasksTable();
    
    // 4. 全テーブルの基本チェック
    await validateAllTables();
    
    // 5. インデックスのチェック
    await validateIndexes();
    
    // 結果表示
    displayResults();
    
  } catch (error) {
    console.error(`${colors.red}Validation failed:${colors.reset}`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateUsersTable() {
  console.log(`${colors.blue}Checking users table...${colors.reset}`);
  
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `;
  
  // 必須カラムのチェック
  const requiredColumns = ['id', 'email', 'name', 'createdAt', 'updatedAt'];
  const columnNames = columns.map(c => c.column_name);
  
  for (const required of requiredColumns) {
    if (columnNames.includes(required)) {
      validationResults.passed.push(`users.${required} exists`);
    } else {
      validationResults.failed.push(`users.${required} is MISSING - This will cause authentication failures`);
    }
  }
  
  // Twitter認証用カラムのチェック
  const twitterColumns = ['twitterId', 'twitterUsername'];
  for (const col of twitterColumns) {
    if (columnNames.includes(col)) {
      validationResults.passed.push(`users.${col} exists for Twitter auth`);
    } else {
      validationResults.warnings.push(`users.${col} is missing - Twitter auth may have issues`);
    }
  }
}

async function validateCotSessionsTable() {
  console.log(`${colors.blue}Checking cot_sessions table...${colors.reset}`);
  
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'cot_sessions'
  `;
  
  const columnNames = columns.map(c => c.column_name);
  
  // themeカラムの確認（expertiseから変更されたか）
  if (columnNames.includes('theme')) {
    validationResults.passed.push('cot_sessions.theme exists (migration successful)');
  } else if (columnNames.includes('expertise')) {
    validationResults.failed.push('cot_sessions still has expertise column - run migration');
  } else {
    validationResults.failed.push('cot_sessions missing both theme and expertise columns');
  }
  
  // 必須カラムのチェック
  const requiredColumns = ['id', 'status', 'current_phase', 'current_step'];
  for (const col of requiredColumns) {
    if (columnNames.includes(col)) {
      validationResults.passed.push(`cot_sessions.${col} exists`);
    } else {
      validationResults.failed.push(`cot_sessions.${col} is MISSING`);
    }
  }
}

async function validateApiTasksTable() {
  console.log(`${colors.blue}Checking api_tasks table...${colors.reset}`);
  
  const tableExists = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'api_tasks'
    )
  `;
  
  if (!tableExists[0].exists) {
    validationResults.failed.push('api_tasks table does not exist - async processing will fail');
    return;
  }
  
  const columns = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'api_tasks'
  `;
  
  const columnNames = columns.map(c => c.column_name);
  const requiredColumns = ['id', 'session_id', 'task_type', 'status', 'request', 'response'];
  
  for (const col of requiredColumns) {
    if (columnNames.includes(col)) {
      validationResults.passed.push(`api_tasks.${col} exists`);
    } else {
      validationResults.failed.push(`api_tasks.${col} is MISSING - async worker will fail`);
    }
  }
}

async function validateAllTables() {
  console.log(`${colors.blue}Checking all tables...${colors.reset}`);
  
  // Prismaスキーマファイルを読み込む
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // モデル名を抽出
  const modelMatches = schemaContent.match(/model\s+(\w+)\s*{/g) || [];
  const prismaModels = modelMatches.map(m => {
    const match = m.match(/model\s+(\w+)/);
    return match ? match[1] : null;
  }).filter(Boolean);
  
  // DBのテーブル一覧を取得
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  `;
  
  const dbTables = tables.map(t => t.table_name);
  
  // Prismaモデルに対応するテーブルが存在するかチェック
  for (const model of prismaModels) {
    // PascalCaseをsnake_caseに変換
    const tableName = model.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + 's';
    
    if (dbTables.includes(tableName)) {
      validationResults.passed.push(`Table ${tableName} exists for model ${model}`);
    } else {
      // 特殊なマッピングをチェック
      const specialMappings = {
        'User': 'users',
        'CotSession': 'cot_sessions',
        'CotPhase': 'cot_phases',
        'CotDraft': 'cot_drafts',
        'ApiTask': 'api_tasks'
      };
      
      const mappedTable = specialMappings[model];
      if (mappedTable && dbTables.includes(mappedTable)) {
        validationResults.passed.push(`Table ${mappedTable} exists for model ${model}`);
      } else {
        validationResults.warnings.push(`Model ${model} may not have corresponding table`);
      }
    }
  }
}

async function validateIndexes() {
  console.log(`${colors.blue}Checking indexes...${colors.reset}`);
  
  const indexes = await prisma.$queryRaw`
    SELECT 
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
  `;
  
  // 重要なインデックスの存在確認
  const importantIndexes = [
    'cot_sessions_status_idx',
    'api_tasks_status_idx',
    'api_tasks_session_id_idx'
  ];
  
  const existingIndexes = indexes.map(i => i.indexname);
  
  for (const idx of importantIndexes) {
    if (existingIndexes.includes(idx)) {
      validationResults.passed.push(`Index ${idx} exists`);
    } else {
      validationResults.warnings.push(`Index ${idx} is missing - may impact performance`);
    }
  }
}

function displayResults() {
  console.log(`\n${colors.cyan}=== Validation Results ===${colors.reset}\n`);
  
  // Passed
  if (validationResults.passed.length > 0) {
    console.log(`${colors.green}✅ Passed (${validationResults.passed.length}):${colors.reset}`);
    validationResults.passed.forEach(item => {
      console.log(`   ${colors.green}✓${colors.reset} ${item}`);
    });
  }
  
  // Failed
  if (validationResults.failed.length > 0) {
    console.log(`\n${colors.red}❌ Failed (${validationResults.failed.length}):${colors.reset}`);
    validationResults.failed.forEach(item => {
      console.log(`   ${colors.red}✗${colors.reset} ${item}`);
    });
  }
  
  // Warnings
  if (validationResults.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Warnings (${validationResults.warnings.length}):${colors.reset}`);
    validationResults.warnings.forEach(item => {
      console.log(`   ${colors.yellow}!${colors.reset} ${item}`);
    });
  }
  
  // Summary
  console.log(`\n${colors.cyan}Summary:${colors.reset}`);
  console.log(`Total checks: ${validationResults.passed.length + validationResults.failed.length + validationResults.warnings.length}`);
  console.log(`Passed: ${colors.green}${validationResults.passed.length}${colors.reset}`);
  console.log(`Failed: ${colors.red}${validationResults.failed.length}${colors.reset}`);
  console.log(`Warnings: ${colors.yellow}${validationResults.warnings.length}${colors.reset}`);
  
  if (validationResults.failed.length > 0) {
    console.log(`\n${colors.red}⚠️  Action Required: Fix the failed items to ensure system stability${colors.reset}`);
  }
}

// 実行
validateSchema().catch(console.error);