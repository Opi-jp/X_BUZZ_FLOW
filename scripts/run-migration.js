#!/usr/bin/env node

/**
 * DBマイグレーション実行スクリプト
 * Prismaのタイムアウト問題を回避するため、直接PostgreSQLに接続して実行
 */

import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

// 環境変数読み込み
dotenv.config({ path: ['.env.local', '.env'] });

const { Client } = pg;

async function runMigration() {
  console.log('🚀 マイグレーション実行を開始します...');
  
  // DIRECT_URLを使用（マイグレーション用）
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    console.error('❌ DIRECT_URLまたはDATABASE_URLが設定されていません');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: directUrl,
  });
  
  try {
    console.log('📊 データベースに接続中...');
    await client.connect();
    console.log('✅ 接続成功');
    
    // SQLファイルを読み込み
    const sql = fs.readFileSync('./prisma/migrations/20250614_add_cot_tables.sql', 'utf8');
    
    console.log('🔨 SQLを実行中...');
    await client.query(sql);
    
    console.log('✅ マイグレーション完了！');
    
    // テーブルの確認
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cot_sessions', 'cot_drafts')
    `);
    
    console.log('\n📋 作成されたテーブル:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// 実行
runMigration();