const fs = require('fs');
const path = require('path');

// 新しいマイグレーションSQLを読み込む
const migrationSQL = fs.readFileSync(
  path.join(__dirname, '../prisma/migrations/new_cot_tables.sql'),
  'utf8'
);

// 本番環境のAPIエンドポイント
const API_URL = 'https://x-buzz-flow.vercel.app/api/db/migrate';

// マイグレーションを実行
async function runMigration() {
  console.log('📊 新しいCoTスキーマのマイグレーションを開始します...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ マイグレーション成功:', result);
    } else {
      console.error('❌ マイグレーションエラー:', result);
    }
  } catch (error) {
    console.error('❌ 実行エラー:', error);
  }
}

runMigration();