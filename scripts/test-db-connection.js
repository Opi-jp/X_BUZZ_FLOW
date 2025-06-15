require('dotenv').config({ path: '.env.local' });

console.log('🔍 データベース接続テスト\n');

// 環境変数の確認
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ 設定済み' : '❌ 未設定');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? '✅ 設定済み' : '❌ 未設定');

// URLのパース
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('\n📊 DATABASE_URL (Pooler) 情報:');
    console.log('  ホスト:', url.hostname);
    console.log('  ポート:', url.port);
    console.log('  データベース:', url.pathname.slice(1).split('?')[0]);
    console.log('  ユーザー:', url.username);
  } catch (e) {
    console.error('DATABASE_URLのパースエラー:', e.message);
  }
}

if (process.env.DIRECT_URL) {
  try {
    const url = new URL(process.env.DIRECT_URL);
    console.log('\n📊 DIRECT_URL 情報:');
    console.log('  ホスト:', url.hostname);
    console.log('  ポート:', url.port);
    console.log('  データベース:', url.pathname.slice(1));
    console.log('  ユーザー:', url.username);
  } catch (e) {
    console.error('DIRECT_URLのパースエラー:', e.message);
  }
}

// Pooler URLでの接続テスト
console.log('\n🔄 Pooler URLで接続テスト中...');
const { Pool } = require('pg');

async function testConnection() {
  const poolerPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const result = await poolerPool.query('SELECT NOW(), current_database(), version()');
    console.log('✅ Pooler接続成功!');
    console.log('  現在時刻:', result.rows[0].now);
    console.log('  データベース:', result.rows[0].current_database);
    console.log('  PostgreSQLバージョン:', result.rows[0].version.split(' ')[1]);
    
    // テーブル一覧を取得
    const tables = await poolerPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
      LIMIT 10
    `);
    
    console.log('\n📋 既存のテーブル（最初の10個）:');
    tables.rows.forEach(row => console.log('  -', row.table_name));
    
  } catch (error) {
    console.error('❌ Pooler接続エラー:', error.message);
  } finally {
    await poolerPool.end();
  }
}

testConnection();