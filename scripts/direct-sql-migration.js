const { Pool } = require('pg')
// .env.localを最初に読み込み、次に.envを読み込む
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

// DIRECT_URLを使用（なければDATABASE_URLを使用）
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!connectionString) {
  console.error('DIRECT_URL not found in environment variables')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
})

async function executeMigration() {
  console.log('🚀 V2テーブルのマイグレーションを開始します...')
  
  const client = await pool.connect()
  
  try {
    // トランザクション開始
    await client.query('BEGIN')
    
    // ViralSessionテーブル
    console.log('\n1. viral_sessions テーブルを作成中...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS viral_sessions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        theme TEXT NOT NULL,
        platform TEXT NOT NULL,
        style TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CREATED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        topics JSONB,
        concepts JSONB,
        selected_ids TEXT[] DEFAULT '{}',
        contents JSONB
      )
    `)
    console.log('✅ viral_sessions テーブルを作成しました')
    
    // ViralDraftV2テーブル
    console.log('\n2. viral_drafts_v2 テーブルを作成中...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS viral_drafts_v2 (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        session_id TEXT NOT NULL,
        concept_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        hashtags TEXT[],
        visual_note TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        posted_at TIMESTAMP WITH TIME ZONE,
        tweet_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES viral_sessions(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ viral_drafts_v2 テーブルを作成しました')
    
    // ViralDraftPerformanceテーブル
    console.log('\n3. viral_draft_performance テーブルを作成中...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS viral_draft_performance (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        draft_id TEXT UNIQUE NOT NULL,
        likes_30m INTEGER,
        retweets_30m INTEGER,
        replies_30m INTEGER,
        impressions_30m INTEGER,
        likes_1h INTEGER,
        retweets_1h INTEGER,
        replies_1h INTEGER,
        impressions_1h INTEGER,
        likes_24h INTEGER,
        retweets_24h INTEGER,
        replies_24h INTEGER,
        impressions_24h INTEGER,
        engagement_rate FLOAT,
        viral_coefficient FLOAT,
        collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT fk_draft FOREIGN KEY (draft_id) REFERENCES viral_drafts_v2(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ viral_draft_performance テーブルを作成しました')
    
    // インデックス作成
    console.log('\n4. インデックスを作成中...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_viral_sessions_status ON viral_sessions(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_session_id ON viral_drafts_v2(session_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_status ON viral_drafts_v2(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_scheduled_at ON viral_drafts_v2(scheduled_at)')
    console.log('✅ インデックスを作成しました')
    
    // トリガー関数
    console.log('\n5. トリガー関数を作成中...')
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `)
    console.log('✅ トリガー関数を作成しました')
    
    // トリガー
    console.log('\n6. トリガーを作成中...')
    await client.query(`
      CREATE TRIGGER update_viral_drafts_v2_updated_at BEFORE UPDATE ON viral_drafts_v2
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `)
    await client.query(`
      CREATE TRIGGER update_viral_draft_performance_updated_at BEFORE UPDATE ON viral_draft_performance
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `)
    console.log('✅ トリガーを作成しました')
    
    // コミット
    await client.query('COMMIT')
    console.log('\n✅ マイグレーションが正常に完了しました！')
    
    // テーブルの確認
    console.log('\n📊 作成されたテーブルの確認:')
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('viral_sessions', 'viral_drafts_v2', 'viral_draft_performance')
      ORDER BY table_name
    `)
    
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`)
    })
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ エラーが発生しました:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

executeMigration().catch(error => {
  console.error(error)
  process.exit(1)
})