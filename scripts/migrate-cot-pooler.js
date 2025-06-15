const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 CoTテーブルのマイグレーションを開始します（Pooler接続使用）...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URLが設定されていません。.env.localファイルを確認してください。');
    process.exit(1);
  }

  console.log('📊 データベースに接続中（Pooler経由）...');
  const pool = new Pool({
    connectionString: databaseUrl,
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

    // SQLを個別のステートメントに分割（DO$$ブロックを考慮）
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    
    migrationSQL.split('\n').forEach(line => {
      currentStatement += line + '\n';
      
      // DO$$ブロックの開始/終了を検出
      if (line.trim().startsWith('DO $$')) {
        inDoBlock = true;
      }
      if (inDoBlock && line.trim().endsWith('$$;')) {
        inDoBlock = false;
      }
      
      // ステートメントの終了を検出
      if (!inDoBlock && line.trim().endsWith(';')) {
        const stmt = currentStatement.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    });

    console.log(`📋 ${statements.length}個のSQLステートメントを実行します...`);

    // トランザクションの代わりに個別実行（Pooler制限のため）
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // SELECTとそれ以外を区別
      const isSelect = statement.trim().toUpperCase().startsWith('SELECT');
      
      try {
        console.log(`\n🔄 実行中 (${i + 1}/${statements.length})...`);
        
        // ステートメントの種類を表示
        const firstLine = statement.split('\n')[0];
        console.log(`   ${firstLine.substring(0, 60)}...`);
        
        const result = await pool.query(statement);
        
        if (isSelect && result.rows.length > 0) {
          console.log('📊 結果:');
          console.table(result.rows);
        } else if (result.command) {
          console.log(`   ✅ ${result.command} 完了`);
          successCount++;
        } else {
          console.log(`   ✅ 実行完了`);
          successCount++;
        }
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate_object')) {
          console.log(`   ⚠️  既に存在します（スキップ）`);
          skipCount++;
        } else {
          console.error(`   ❌ エラー: ${error.message}`);
          errorCount++;
          // 重要なエラーの場合は詳細を表示
          if (!error.message.includes('already exists')) {
            console.error(`      詳細: ${error.detail || 'なし'}`);
            console.error(`      ヒント: ${error.hint || 'なし'}`);
          }
        }
      }
    }

    // 結果サマリー
    console.log('\n📊 実行結果サマリー:');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ⚠️  スキップ: ${skipCount}`);
    console.log(`  ❌ エラー: ${errorCount}`);

    // 最終確認
    console.log('\n📊 最終確認: CoTテーブルの存在確認');
    const tablesResult = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name 
         AND table_schema = 'public') as column_count,
        (SELECT COUNT(*) FROM information_schema.table_constraints
         WHERE table_name = t.table_name 
         AND table_schema = 'public'
         AND constraint_type = 'FOREIGN KEY') as fk_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('cot_sessions', 'cot_phases', 'cot_drafts', 'cot_draft_performance')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.table(tablesResult.rows);
      console.log('✅ CoTテーブルが正常に作成されました！');
    } else {
      console.log('⚠️  CoTテーブルが見つかりません。マイグレーションが失敗した可能性があります。');
    }

    // Enum型の確認
    console.log('\n📊 CoT関連のEnum型:');
    const enumsResult = await pool.query(`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE 'cot_%'
      GROUP BY t.typname
      ORDER BY t.typname
    `);
    
    if (enumsResult.rows.length > 0) {
      console.table(enumsResult.rows);
    } else {
      console.log('⚠️  CoT関連のEnum型が見つかりません。');
    }

    console.log('\n✅ マイグレーション処理完了！');

  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    console.error('詳細:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
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
console.log('💡 注意: Supabase Pooler経由での実行のため、一部の機能に制限があります。');
console.log('   （トランザクション、プリペアドステートメントなど）\n');

runMigration().catch(console.error);