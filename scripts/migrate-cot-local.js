const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 CoTテーブルのマイグレーションを開始します（ローカル実行）...');
  
  const directUrl = process.env.DIRECT_URL;
  
  if (!directUrl) {
    console.error('❌ DIRECT_URLが設定されていません。.env.localファイルを確認してください。');
    process.exit(1);
  }

  console.log('📊 データベースに接続中...');
  const pool = new Pool({
    connectionString: directUrl,
  });

  try {
    // 接続テスト
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ データベース接続成功:', testResult.rows[0].now);

    // マイグレーションSQLを読み込む
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../prisma/migrations/cot_migration_manual.sql'),
      'utf8'
    );

    // SQLを個別のステートメントに分割
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`📋 ${statements.length}個のSQLステートメントを実行します...`);

    // 各ステートメントを実行
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // コメントやSELECT文の識別
      const isComment = statement.trim().startsWith('--');
      const isSelect = statement.trim().toUpperCase().startsWith('SELECT');
      
      if (isComment) {
        console.log(`💬 ${statement.trim()}`);
        continue;
      }

      try {
        console.log(`\n🔄 実行中 (${i + 1}/${statements.length})...`);
        
        // ステートメントの最初の50文字を表示
        const preview = statement.substring(0, 50).replace(/\n/g, ' ');
        console.log(`   ${preview}...`);
        
        const result = await pool.query(statement);
        
        if (isSelect && result.rows.length > 0) {
          console.log('📊 結果:');
          console.table(result.rows);
        } else if (result.command) {
          console.log(`   ✅ ${result.command} 完了`);
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  既に存在します（スキップ）`);
        } else {
          console.error(`   ❌ エラー: ${error.message}`);
          // エラーが発生しても続行
        }
      }
    }

    // 最終確認
    console.log('\n📊 最終確認: 作成されたテーブル');
    const tablesResult = await pool.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name 
              AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('cot_sessions', 'cot_phases', 'cot_drafts', 'cot_draft_performance')
      ORDER BY table_name
    `);
    
    console.table(tablesResult.rows);

    // Enum型の確認
    console.log('\n📊 作成されたEnum型:');
    const enumsResult = await pool.query(`
      SELECT typname as enum_name, 
             array_to_string(array_agg(enumlabel ORDER BY enumsortorder), ', ') as values
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE typname LIKE 'cot_%'
      GROUP BY typname
      ORDER BY typname
    `);
    
    if (enumsResult.rows.length > 0) {
      console.table(enumsResult.rows);
    }

    console.log('\n✅ マイグレーション完了！');

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    console.error('詳細:', error.message);
  } finally {
    await pool.end();
    console.log('🔌 データベース接続を終了しました');
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});

// 実行
runMigration().catch(console.error);