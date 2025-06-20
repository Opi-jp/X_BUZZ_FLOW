const { Client } = require('pg');
const fs = require('fs');

async function executeSql() {
  // Pooler URLを使用
  const client = new Client({
    connectionString: 'postgresql://postgres.atyvtqorzthnszyulquu:Yusuke0508@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました');

    // SQLファイルを読み込む
    const sql = fs.readFileSync('./create-missing-tables.sql', 'utf8');
    
    // SQLを実行
    await client.query(sql);
    console.log('テーブルが正常に作成されました');

    // テーブルの存在確認
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('accounts', 'news_analysis_jobs', 'news_analysis_results')
    `);
    
    console.log('作成されたテーブル:');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

executeSql();