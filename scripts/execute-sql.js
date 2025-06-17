const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = 'https://atyvtqorzthnszyulquu.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('SUPABASE_ANON_KEY not found in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeMigration() {
  console.log('🚀 V2テーブルのマイグレーションを開始します...')
  
  const statements = [
    // ViralSessionテーブル
    `CREATE TABLE IF NOT EXISTS viral_sessions (
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
    )`,
    
    // ViralDraftV2テーブル
    `CREATE TABLE IF NOT EXISTS viral_drafts_v2 (
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
    )`,
    
    // ViralDraftPerformanceテーブル
    `CREATE TABLE IF NOT EXISTS viral_draft_performance (
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
    )`,
    
    // インデックス
    `CREATE INDEX IF NOT EXISTS idx_viral_sessions_status ON viral_sessions(status)`,
    `CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_session_id ON viral_drafts_v2(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_status ON viral_drafts_v2(status)`,
    `CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_scheduled_at ON viral_drafts_v2(scheduled_at)`,
    
    // トリガー関数
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'`,
    
    // トリガー
    `CREATE TRIGGER update_viral_drafts_v2_updated_at BEFORE UPDATE ON viral_drafts_v2
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    
    `CREATE TRIGGER update_viral_draft_performance_updated_at BEFORE UPDATE ON viral_draft_performance
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
  ]
  
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`\n実行中 (${i + 1}/${statements.length}):`)
    console.log(statement.substring(0, 60) + '...')
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        // RPCが存在しない場合は別の方法を試す
        if (error.message.includes('function') || error.message.includes('exec_sql')) {
          console.log('⚠️  RPC not available, trying direct approach...')
          // Supabase JSクライアントでは直接SQL実行ができないため、
          // テーブル作成は手動で行う必要があります
          console.log('❌ このステートメントは手動で実行してください')
          errorCount++
        } else {
          throw error
        }
      } else {
        console.log('✅ 成功')
        successCount++
      }
    } catch (error) {
      console.log('❌ エラー:', error.message)
      errorCount++
    }
  }
  
  console.log(`\n📊 結果: ${successCount}成功, ${errorCount}エラー`)
  
  // テーブルの存在確認
  console.log('\n📋 テーブルの確認...')
  
  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from('viral_sessions')
      .select('id')
      .limit(1)
    
    if (!sessionsError) {
      console.log('✅ viral_sessions テーブルが存在します')
    } else {
      console.log('❌ viral_sessions:', sessionsError.message)
    }
    
    const { data: drafts, error: draftsError } = await supabase
      .from('viral_drafts_v2')
      .select('id')
      .limit(1)
    
    if (!draftsError) {
      console.log('✅ viral_drafts_v2 テーブルが存在します')
    } else {
      console.log('❌ viral_drafts_v2:', draftsError.message)
    }
    
    const { data: perf, error: perfError } = await supabase
      .from('viral_draft_performance')
      .select('id')
      .limit(1)
    
    if (!perfError) {
      console.log('✅ viral_draft_performance テーブルが存在します')
    } else {
      console.log('❌ viral_draft_performance:', perfError.message)
    }
  } catch (error) {
    console.log('テーブル確認エラー:', error)
  }
}

executeMigration().catch(console.error)