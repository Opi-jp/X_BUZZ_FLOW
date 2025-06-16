#!/usr/bin/env node

/**
 * DBとフロントエンドの定義の同期をチェックするツール
 * TypeScriptインターフェースとDBスキーマの不一致を検出
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../lib/generated/prisma');

require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

// チェック結果
const syncIssues = {
  typesMismatch: [],
  missingInDB: [],
  missingInCode: [],
  namingInconsistency: []
};

async function checkSync() {
  console.log('=== DB-Frontend Sync Checker ===\n');
  
  try {
    // 1. TypeScript型定義を収集
    const typeDefinitions = await collectTypeDefinitions();
    
    // 2. DB構造を取得
    const dbStructure = await getDBStructure();
    
    // 3. 比較実行
    await compareStructures(typeDefinitions, dbStructure);
    
    // 4. API ルートのチェック
    await checkAPIRoutes();
    
    // 5. フォームとDBフィールドの一致確認
    await checkFormFields();
    
    // 結果表示
    displaySyncResults();
    
  } catch (error) {
    console.error('Sync check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function collectTypeDefinitions() {
  console.log('Collecting TypeScript definitions...');
  
  const definitions = new Map();
  
  // 主要な型定義ファイルをチェック
  const typeFiles = [
    'app/types/index.ts',
    'app/types/viral.ts',
    'app/types/cot.ts',
    'lib/types.ts'
  ];
  
  for (const file of typeFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // インターフェース定義を抽出
      const interfaceMatches = content.match(/interface\s+(\w+)\s*{([^}]+)}/g) || [];
      interfaceMatches.forEach(match => {
        const nameMatch = match.match(/interface\s+(\w+)/);
        const name = nameMatch ? nameMatch[1] : null;
        
        if (name) {
          const fields = extractFields(match);
          definitions.set(name, fields);
        }
      });
      
      // type定義も抽出
      const typeMatches = content.match(/type\s+(\w+)\s*=\s*{([^}]+)}/g) || [];
      typeMatches.forEach(match => {
        const nameMatch = match.match(/type\s+(\w+)/);
        const name = nameMatch ? nameMatch[1] : null;
        
        if (name) {
          const fields = extractFields(match);
          definitions.set(name, fields);
        }
      });
    }
  }
  
  return definitions;
}

function extractFields(typeDefinition) {
  const fields = [];
  const fieldMatches = typeDefinition.match(/(\w+)(\?)?:\s*([^;,\n]+)/g) || [];
  
  fieldMatches.forEach(field => {
    const match = field.match(/(\w+)(\?)?:\s*(.+)/);
    if (match) {
      fields.push({
        name: match[1],
        optional: !!match[2],
        type: match[3].trim()
      });
    }
  });
  
  return fields;
}

async function getDBStructure() {
  console.log('Getting database structure...');
  
  const structure = new Map();
  
  // 主要テーブルの構造を取得
  const tables = ['users', 'cot_sessions', 'cot_phases', 'cot_drafts', 'api_tasks'];
  
  for (const table of tables) {
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = ${table}
      ORDER BY ordinal_position
    `;
    
    structure.set(table, columns);
  }
  
  return structure;
}

async function compareStructures(typeDefinitions, dbStructure) {
  console.log('Comparing structures...\n');
  
  // CotSession型とcot_sessionsテーブルの比較
  if (typeDefinitions.has('CotSession')) {
    const cotSessionType = typeDefinitions.get('CotSession');
    const cotSessionDB = dbStructure.get('cot_sessions');
    
    compareTypeAndTable('CotSession', cotSessionType, cotSessionDB);
  }
  
  // User型とusersテーブルの比較
  if (typeDefinitions.has('User')) {
    const userType = typeDefinitions.get('User');
    const usersDB = dbStructure.get('users');
    
    compareTypeAndTable('User', userType, usersDB);
  }
}

function compareTypeAndTable(typeName, typeFields, dbColumns) {
  console.log(`Checking ${typeName}...`);
  
  const dbFieldNames = dbColumns.map(col => col.column_name);
  
  // TypeScriptフィールドがDBに存在するかチェック
  typeFields.forEach(field => {
    const snakeCase = field.name.replace(/([A-Z])/g, '_$1').toLowerCase();
    
    if (!dbFieldNames.includes(field.name) && !dbFieldNames.includes(snakeCase)) {
      syncIssues.missingInDB.push({
        type: typeName,
        field: field.name,
        expectedDB: snakeCase
      });
    }
  });
  
  // DBカラムがTypeScriptに存在するかチェック
  dbColumns.forEach(col => {
    const camelCase = col.column_name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    const hasField = typeFields.some(f => 
      f.name === col.column_name || f.name === camelCase
    );
    
    if (!hasField && !['created_at', 'updated_at', 'id'].includes(col.column_name)) {
      syncIssues.missingInCode.push({
        type: typeName,
        dbColumn: col.column_name,
        expectedField: camelCase
      });
    }
  });
}

async function checkAPIRoutes() {
  console.log('Checking API routes...');
  
  // APIルートでの不一致をチェック
  const apiRoutes = [
    'app/api/viral/cot-session/create/route.ts',
    'app/api/viral/cot-session/[sessionId]/route.ts'
  ];
  
  for (const route of apiRoutes) {
    const filePath = path.join(__dirname, '..', route);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // リクエストボディのパース部分をチェック
      if (content.includes('expertise') && !content.includes('theme')) {
        syncIssues.namingInconsistency.push({
          file: route,
          issue: 'Still using "expertise" instead of "theme"'
        });
      }
      
      // createdAtフィールドの使用をチェック
      if (content.includes('createdAt') && !content.includes('created_at')) {
        console.log(`  Warning: ${route} uses camelCase "createdAt" - ensure DB compatibility`);
      }
    }
  }
}

async function checkFormFields() {
  console.log('Checking form fields...');
  
  // フォームコンポーネントをチェック
  const formFiles = [
    'app/viral/cot/CoTCreationForm.tsx',
    'app/components/forms/SessionForm.tsx'
  ];
  
  for (const file of formFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // フォームフィールドとDBフィールドの一致を確認
      const formFields = content.match(/name=["'](\w+)["']/g) || [];
      formFields.forEach(field => {
        const fieldName = field.match(/name=["'](\w+)["']/)?.[1];
        if (fieldName) {
          // ここでDBフィールドとの一致を確認
          console.log(`  Form field found: ${fieldName}`);
        }
      });
    }
  }
}

function displaySyncResults() {
  console.log('\n=== Sync Check Results ===\n');
  
  // Missing in DB
  if (syncIssues.missingInDB.length > 0) {
    console.log('❌ Fields missing in database:');
    syncIssues.missingInDB.forEach(issue => {
      console.log(`   - ${issue.type}.${issue.field} (expected DB column: ${issue.expectedDB})`);
    });
  }
  
  // Missing in Code
  if (syncIssues.missingInCode.length > 0) {
    console.log('\n❌ DB columns missing in TypeScript:');
    syncIssues.missingInCode.forEach(issue => {
      console.log(`   - ${issue.type} missing field for DB column: ${issue.dbColumn}`);
    });
  }
  
  // Naming inconsistencies
  if (syncIssues.namingInconsistency.length > 0) {
    console.log('\n⚠️  Naming inconsistencies:');
    syncIssues.namingInconsistency.forEach(issue => {
      console.log(`   - ${issue.file}: ${issue.issue}`);
    });
  }
  
  // Summary
  const totalIssues = 
    syncIssues.missingInDB.length + 
    syncIssues.missingInCode.length + 
    syncIssues.namingInconsistency.length;
  
  if (totalIssues === 0) {
    console.log('✅ No sync issues found!');
  } else {
    console.log(`\n⚠️  Total issues found: ${totalIssues}`);
    console.log('These inconsistencies can cause runtime errors and make debugging difficult.');
  }
}

// 実行
checkSync().catch(console.error);