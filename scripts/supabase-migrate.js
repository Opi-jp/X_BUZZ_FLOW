#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Supabase接続情報を環境変数から取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://atyvtqorzthnszyulquu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  console.log('📝 .env.local に以下を追加してください:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('\n💡 Service Role Keyの取得方法:');
  console.log('1. https://supabase.com にアクセス');
  console.log('2. プロジェクトを選択');
  console.log('3. Settings → API');
  console.log('4. "service_role" キーをコピー（"anon" キーではありません）');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sqlContent, description) {
  console.log(`\n🔄 実行中: ${description}`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });
    
    if (error) {
      // RPCが存在しない場合は、直接SQLを実行
      if (error.message.includes('exec_sql')) {
        console.log('⚠️  exec_sql RPC が存在しません。代替方法を使用します。');
        
        // SQLを個別のステートメントに分割
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          console.log(`   実行: ${statement.substring(0, 50)}...`);
          
          // Supabase JSクライアントでは直接SQL実行ができないため、
          // REST APIを使用
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              query: statement
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ エラー: ${errorText}`);
            return false;
          }
        }
        console.log('✅ 完了');
        return true;
      } else {
        console.error(`❌ エラー: ${error.message}`);
        return false;
      }
    }
    
    console.log('✅ 完了');
    return true;
  } catch (err) {
    console.error(`❌ エラー: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Supabaseマイグレーション開始');
  console.log(`📍 URL: ${supabaseUrl}`);
  
  // fix-users-table.sqlを実行
  const sqlPath = path.resolve(__dirname, '../fix-users-table.sql');
  if (fs.existsSync(sqlPath)) {
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    await executeSql(sqlContent, 'usersテーブルのカラム追加');
  }
  
  // 他のマイグレーションもここに追加可能
  
  console.log('\n✨ マイグレーション完了');
}

// 実行
main().catch(console.error);