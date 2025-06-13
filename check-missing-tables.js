const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    connectionString: 'postgresql://postgres.atyvtqorzthnszyulquu:Yusuke0508@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました\n');

    // Prismaスキーマで定義されているテーブル一覧
    const expectedTables = [
      'buzz_posts',
      'scheduled_posts',
      'post_analytics',
      'ai_patterns',
      'news_sources',
      'news_articles',
      'news_threads',
      'news_thread_items',
      'news_analysis_jobs',
      'news_analysis_results',
      'users',
      'accounts',
      'sessions',
      'watchlist_tweets',
      'collection_presets',
      'viral_opportunities',
      'viral_posts',
      'viral_post_performance',
      'viral_analysis_logs',
      'viral_config',
      'gpt_analyses',
      'content_drafts',
      'prompt_templates',
      'perplexity_reports'
    ];

    // 実際に存在するテーブルを確認
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const existingTables = result.rows.map(row => row.table_name);
    
    console.log('=== 既存のテーブル ===');
    existingTables.forEach(table => {
      console.log(`✓ ${table}`);
    });

    console.log('\n=== 不足しているテーブル ===');
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('すべてのテーブルが存在します！');
    } else {
      missingTables.forEach(table => {
        console.log(`✗ ${table}`);
      });
      console.log(`\n合計 ${missingTables.length} 個のテーブルが不足しています。`);
    }

  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.end();
  }
}

checkTables();