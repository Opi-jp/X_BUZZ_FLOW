#!/usr/bin/env node

const { PrismaClient } = require('../lib/generated/prisma')

async function applyUnifiedMigration() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚀 統合システムのマイグレーションを開始します...')
    
    // 1. RTステータスのEnum作成
    console.log('1. RTステータスEnumを作成中...')
    try {
      await prisma.$executeRaw`
        DO $$ BEGIN
          CREATE TYPE rt_status AS ENUM ('SCHEDULED', 'EXECUTED', 'FAILED', 'CANCELLED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
      console.log('✅ RTステータスEnum作成完了')
    } catch (error) {
      console.log('⚠️  RTステータスEnumは既に存在します')
    }
    
    // 2. scheduled_retweetsテーブル作成
    console.log('2. scheduled_retweetsテーブルを作成中...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS scheduled_retweets (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        original_post_id TEXT NOT NULL,
        original_content TEXT NOT NULL,
        scheduled_at TIMESTAMP(3) NOT NULL,
        status rt_status NOT NULL DEFAULT 'SCHEDULED',
        rt_strategy TEXT NOT NULL,
        add_comment BOOLEAN NOT NULL DEFAULT false,
        comment_text TEXT,
        viral_draft_id TEXT,
        cot_draft_id TEXT,
        executed_at TIMESTAMP(3),
        rt_post_id TEXT,
        error TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT scheduled_retweets_pkey PRIMARY KEY (id)
      )
    `
    console.log('✅ scheduled_retweetsテーブル作成完了')
    
    // 3. インデックス作成
    console.log('3. インデックスを作成中...')
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS scheduled_retweets_status_scheduled_at_idx 
      ON scheduled_retweets(status, scheduled_at)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS scheduled_retweets_original_post_id_idx 
      ON scheduled_retweets(original_post_id)
    `
    console.log('✅ インデックス作成完了')
    
    // 4. unified_performanceテーブル作成
    console.log('4. unified_performanceテーブルを作成中...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS unified_performance (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        content_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        metrics_30m JSONB,
        metrics_1h JSONB,
        metrics_24h JSONB,
        engagement_rate DOUBLE PRECISION,
        viral_coefficient DOUBLE PRECISION,
        collected_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unified_performance_pkey PRIMARY KEY (id),
        CONSTRAINT unified_performance_content_id_key UNIQUE (content_id)
      )
    `
    console.log('✅ unified_performanceテーブル作成完了')
    
    // 5. news_viral_relationsテーブル作成
    console.log('5. news_viral_relationsテーブルを作成中...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS news_viral_relations (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        news_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        relevance_score DOUBLE PRECISION,
        used_in_content BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT news_viral_relations_pkey PRIMARY KEY (id),
        CONSTRAINT news_viral_relations_unique UNIQUE (news_id, session_id)
      )
    `
    console.log('✅ news_viral_relationsテーブル作成完了')
    
    // 6. session_activity_logsテーブル作成
    console.log('6. session_activity_logsテーブルを作成中...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS session_activity_logs (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        session_id TEXT NOT NULL,
        session_type TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT session_activity_logs_pkey PRIMARY KEY (id)
      )
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS session_activity_logs_session_id_idx 
      ON session_activity_logs(session_id)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS session_activity_logs_created_at_idx 
      ON session_activity_logs(created_at)
    `
    console.log('✅ session_activity_logsテーブル作成完了')
    
    // 7. api_error_logsテーブル作成
    console.log('7. api_error_logsテーブルを作成中...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS api_error_logs (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        error_message TEXT,
        stack_trace TEXT,
        request_body JSONB,
        request_headers JSONB,
        user_agent TEXT,
        ip_address TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT api_error_logs_pkey PRIMARY KEY (id)
      )
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS api_error_logs_endpoint_idx 
      ON api_error_logs(endpoint)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS api_error_logs_status_code_idx 
      ON api_error_logs(status_code)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS api_error_logs_created_at_idx 
      ON api_error_logs(created_at)
    `
    console.log('✅ api_error_logsテーブル作成完了')
    
    // 8. character_profilesテーブルの拡張
    console.log('8. character_profilesテーブルを拡張中...')
    await prisma.$executeRaw`
      ALTER TABLE character_profiles 
      ADD COLUMN IF NOT EXISTS preferred_news_categories TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS news_comment_style JSONB,
      ADD COLUMN IF NOT EXISTS topic_expertise JSONB
    `
    console.log('✅ character_profilesテーブル拡張完了')
    
    // 9. viral_drafts_v2テーブルの拡張
    console.log('9. viral_drafts_v2テーブルを拡張中...')
    await prisma.$executeRaw`
      ALTER TABLE viral_drafts_v2
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS news_article_id TEXT
    `
    console.log('✅ viral_drafts_v2テーブル拡張完了')
    
    // 10. news_articlesテーブルの拡張
    console.log('10. news_articlesテーブルを拡張中...')
    await prisma.$executeRaw`
      ALTER TABLE news_articles 
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS importance DOUBLE PRECISION
    `
    console.log('✅ news_articlesテーブル拡張完了')
    
    // 11. ビューの作成
    console.log('11. active_scheduled_contentビューを作成中...')
    await prisma.$executeRaw`
      CREATE OR REPLACE VIEW active_scheduled_content AS
      SELECT 
        'VIRAL' as type,
        id,
        title,
        scheduled_at,
        status::text as status
      FROM viral_drafts_v2
      WHERE status = 'SCHEDULED' AND scheduled_at > NOW()
      UNION ALL
      SELECT 
        'COT' as type,
        id,
        title,
        scheduled_at,
        status::text as status
      FROM cot_drafts
      WHERE status = 'SCHEDULED' AND scheduled_at > NOW()
      UNION ALL
      SELECT 
        'RT' as type,
        id,
        original_content as title,
        scheduled_at,
        status::text as status
      FROM scheduled_retweets
      WHERE status = 'SCHEDULED' AND scheduled_at > NOW()
      ORDER BY scheduled_at ASC
    `
    console.log('✅ active_scheduled_contentビュー作成完了')
    
    // 12. トリガー関数の作成
    console.log('12. updated_atトリガーを作成中...')
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `
    
    // トリガーの適用
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS update_scheduled_retweets_updated_at ON scheduled_retweets
    `
    await prisma.$executeRaw`
      CREATE TRIGGER update_scheduled_retweets_updated_at 
      BEFORE UPDATE ON scheduled_retweets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `
    
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS update_unified_performance_updated_at ON unified_performance
    `
    await prisma.$executeRaw`
      CREATE TRIGGER update_unified_performance_updated_at 
      BEFORE UPDATE ON unified_performance
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `
    
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS update_news_articles_updated_at ON news_articles
    `
    await prisma.$executeRaw`
      CREATE TRIGGER update_news_articles_updated_at 
      BEFORE UPDATE ON news_articles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `
    console.log('✅ トリガー作成完了')
    
    console.log('\n🎉 統合システムのマイグレーションが完了しました！')
    
  } catch (error) {
    console.error('❌ マイグレーション中にエラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
applyUnifiedMigration()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })