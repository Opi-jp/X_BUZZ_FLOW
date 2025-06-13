const { Client } = require('pg');

async function checkTableSchema() {
  const client = new Client({
    connectionString: 'postgresql://postgres.atyvtqorzthnszyulquu:Yusuke0508@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました\n');

    // content_draftsテーブルのスキーマを確認
    const result = await client.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'content_drafts'
      ORDER BY ordinal_position
    `);

    console.log('=== content_drafts テーブルのスキーマ ===');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (${col.udt_name}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // buzz_factorsとhashtagsの詳細を確認
    const arrayFields = result.rows.filter(col => 
      col.column_name === 'buzz_factors' || col.column_name === 'hashtags'
    );

    console.log('\n=== 配列フィールドの詳細 ===');
    arrayFields.forEach(field => {
      console.log(`${field.column_name}: ${field.data_type} (${field.udt_name})`);
    });

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

checkTableSchema();