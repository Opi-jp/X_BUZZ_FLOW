require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })
const { PrismaClient } = require('../lib/generated/prisma')

const prisma = new PrismaClient()

async function executeMigration() {
  console.log('🚀 V2テーブルのマイグレーションを開始します...')
  
  try {
    // まずはデータベースに接続できるか確認
    console.log('データベース接続をテスト中...')
    const testResult = await prisma.$queryRaw`SELECT current_database()`
    console.log('✅ データベースに接続しました:', testResult[0].current_database)
    
    // トランザクション内で実行
    await prisma.$transaction(async (tx) => {
      // ViralSessionテーブル
      console.log('\n1. viral_sessions テーブルを作成中...')
      await tx.$executeRaw`
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
      `
      console.log('✅ viral_sessions テーブルを作成しました')
      
      // ViralDraftV2テーブル
      console.log('\n2. viral_drafts_v2 テーブルを作成中...')
      await tx.$executeRaw`
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
      `
      console.log('✅ viral_drafts_v2 テーブルを作成しました')
      
      // ViralDraftPerformanceテーブル
      console.log('\n3. viral_draft_performance テーブルを作成中...')
      await tx.$executeRaw`
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
      `
      console.log('✅ viral_draft_performance テーブルを作成しました')
      
      // インデックス作成
      console.log('\n4. インデックスを作成中...')
      await tx.$executeRaw`CREATE INDEX IF NOT EXISTS idx_viral_sessions_status ON viral_sessions(status)`
      await tx.$executeRaw`CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_session_id ON viral_drafts_v2(session_id)`
      await tx.$executeRaw`CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_status ON viral_drafts_v2(status)`
      await tx.$executeRaw`CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_scheduled_at ON viral_drafts_v2(scheduled_at)`
      console.log('✅ インデックスを作成しました')
      
      // トリガー関数
      console.log('\n5. トリガー関数を作成中...')
      await tx.$executeRaw`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `
      console.log('✅ トリガー関数を作成しました')
      
      // トリガー
      console.log('\n6. トリガーを作成中...')
      await tx.$executeRaw`
        CREATE TRIGGER update_viral_drafts_v2_updated_at BEFORE UPDATE ON viral_drafts_v2
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `
      await tx.$executeRaw`
        CREATE TRIGGER update_viral_draft_performance_updated_at BEFORE UPDATE ON viral_draft_performance
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `
      console.log('✅ トリガーを作成しました')
    })
    
    console.log('\n✅ マイグレーションが正常に完了しました！')
    
    // テーブルの確認
    console.log('\n📊 作成されたテーブルの確認:')
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('viral_sessions', 'viral_drafts_v2', 'viral_draft_performance')
      ORDER BY table_name
    `
    
    tables.forEach(row => {
      console.log(`  ✓ ${row.table_name}`)
    })
    
    // レコード数の確認
    const sessionCount = await prisma.viralSession.count()
    const draftCount = await prisma.viralDraftV2.count()
    console.log(`\n📈 レコード数:`)
    console.log(`  - viral_sessions: ${sessionCount}`)
    console.log(`  - viral_drafts_v2: ${draftCount}`)
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

executeMigration().catch(error => {
  console.error(error)
  process.exit(1)
})