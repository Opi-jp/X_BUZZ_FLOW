const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runCompleteMigration() {
  console.log('🚀 CoT完全マイグレーションを開始します...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // ステップ1: Enum型の作成
    console.log('📋 ステップ1: Enum型を作成中...');
    
    // PostStatus, PostType も含めて作成（既存チェック付き）
    const enumQueries = [
      {
        name: 'PostStatus',
        values: ['DRAFT', 'SCHEDULED', 'POSTED', 'FAILED'],
        query: `DO $$ BEGIN
          CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'POSTED', 'FAILED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      },
      {
        name: 'PostType',
        values: ['NEW', 'RETWEET', 'QUOTE'],
        query: `DO $$ BEGIN
          CREATE TYPE "PostType" AS ENUM ('NEW', 'RETWEET', 'QUOTE');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      },
      {
        name: 'cot_session_status',
        values: ['PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED', 'PAUSED'],
        query: `DO $$ BEGIN
          CREATE TYPE "cot_session_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED', 'PAUSED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      },
      {
        name: 'cot_phase_step',
        values: ['THINK', 'EXECUTE', 'INTEGRATE'],
        query: `DO $$ BEGIN
          CREATE TYPE "cot_phase_step" AS ENUM ('THINK', 'EXECUTE', 'INTEGRATE');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      },
      {
        name: 'cot_phase_status',
        values: ['PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED'],
        query: `DO $$ BEGIN
          CREATE TYPE "cot_phase_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      },
      {
        name: 'cot_draft_status',
        values: ['DRAFT', 'EDITED', 'SCHEDULED', 'POSTED', 'ARCHIVED'],
        query: `DO $$ BEGIN
          CREATE TYPE "cot_draft_status" AS ENUM ('DRAFT', 'EDITED', 'SCHEDULED', 'POSTED', 'ARCHIVED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`
      }
    ];

    for (const enumDef of enumQueries) {
      try {
        await pool.query(enumDef.query);
        console.log(`  ✅ ${enumDef.name} 作成完了`);
      } catch (error) {
        console.log(`  ⚠️  ${enumDef.name} - ${error.message}`);
      }
    }

    // Enum型の確認
    const enumCheck = await pool.query(`
      SELECT typname, array_agg(enumlabel ORDER BY enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE typname LIKE 'cot_%' OR typname IN ('PostStatus', 'PostType')
      GROUP BY typname
      ORDER BY typname
    `);
    
    console.log('\n📊 作成されたEnum型:');
    console.table(enumCheck.rows);

    // ステップ2: テーブルの作成
    console.log('\n📋 ステップ2: テーブルを作成中...');

    // cot_sessionsテーブル
    console.log('  🔄 cot_sessionsテーブル...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "cot_sessions" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "expertise" TEXT NOT NULL,
        "style" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "status" "cot_session_status" NOT NULL DEFAULT 'PENDING',
        "current_phase" INTEGER NOT NULL DEFAULT 1,
        "current_step" "cot_phase_step" NOT NULL DEFAULT 'THINK',
        "last_error" TEXT,
        "retry_count" INTEGER NOT NULL DEFAULT 0,
        "next_retry_at" TIMESTAMP(3),
        "total_tokens" INTEGER NOT NULL DEFAULT 0,
        "total_duration" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completed_at" TIMESTAMP(3),
        CONSTRAINT "cot_sessions_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ✅ cot_sessionsテーブル作成完了');

    // cot_phasesテーブル
    console.log('  🔄 cot_phasesテーブル...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "cot_phases" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "session_id" TEXT NOT NULL,
        "phase_number" INTEGER NOT NULL,
        "think_prompt" TEXT,
        "think_result" JSONB,
        "think_tokens" INTEGER DEFAULT 0,
        "think_at" TIMESTAMP(3),
        "execute_result" JSONB,
        "execute_duration" INTEGER DEFAULT 0,
        "execute_at" TIMESTAMP(3),
        "integrate_prompt" TEXT,
        "integrate_result" JSONB,
        "integrate_tokens" INTEGER DEFAULT 0,
        "integrate_at" TIMESTAMP(3),
        "status" "cot_phase_status" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "cot_phases_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ✅ cot_phasesテーブル作成完了');

    // cot_draftsテーブル
    console.log('  🔄 cot_draftsテーブル...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "cot_drafts" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "session_id" TEXT NOT NULL,
        "concept_number" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "hook" TEXT NOT NULL,
        "angle" TEXT NOT NULL,
        "format" TEXT NOT NULL,
        "content" TEXT,
        "thread_content" JSONB,
        "visual_guide" TEXT,
        "timing" TEXT NOT NULL,
        "hashtags" TEXT[],
        "news_source" TEXT,
        "source_url" TEXT,
        "kpis" JSONB,
        "risk_assessment" JSONB,
        "optimization_tips" JSONB,
        "status" "cot_draft_status" NOT NULL DEFAULT 'DRAFT',
        "edited_content" TEXT,
        "scheduled_at" TIMESTAMP(3),
        "posted_at" TIMESTAMP(3),
        "post_id" TEXT,
        "viral_score" DOUBLE PRECISION,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "cot_drafts_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ✅ cot_draftsテーブル作成完了');

    // cot_draft_performanceテーブル
    console.log('  🔄 cot_draft_performanceテーブル...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "cot_draft_performance" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "draft_id" TEXT NOT NULL,
        "likes_30m" INTEGER,
        "retweets_30m" INTEGER,
        "replies_30m" INTEGER,
        "impressions_30m" INTEGER,
        "likes_1h" INTEGER,
        "retweets_1h" INTEGER,
        "replies_1h" INTEGER,
        "impressions_1h" INTEGER,
        "likes_24h" INTEGER,
        "retweets_24h" INTEGER,
        "replies_24h" INTEGER,
        "impressions_24h" INTEGER,
        "engagement_rate" DOUBLE PRECISION,
        "viral_coefficient" DOUBLE PRECISION,
        "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_update_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "cot_draft_performance_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('  ✅ cot_draft_performanceテーブル作成完了');

    // ステップ3: インデックスの作成
    console.log('\n📋 ステップ3: インデックスを作成中...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS "cot_sessions_status_created_at_idx" ON "cot_sessions"("status", "created_at")`,
      `CREATE INDEX IF NOT EXISTS "cot_sessions_current_phase_current_step_idx" ON "cot_sessions"("current_phase", "current_step")`,
      `CREATE INDEX IF NOT EXISTS "cot_phases_session_id_phase_number_idx" ON "cot_phases"("session_id", "phase_number")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "cot_phases_session_id_phase_number_key" ON "cot_phases"("session_id", "phase_number")`,
      `CREATE INDEX IF NOT EXISTS "cot_drafts_session_id_idx" ON "cot_drafts"("session_id")`,
      `CREATE INDEX IF NOT EXISTS "cot_drafts_status_idx" ON "cot_drafts"("status")`,
      `CREATE INDEX IF NOT EXISTS "cot_drafts_scheduled_at_idx" ON "cot_drafts"("scheduled_at")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "cot_drafts_session_id_concept_number_key" ON "cot_drafts"("session_id", "concept_number")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "cot_draft_performance_draft_id_key" ON "cot_draft_performance"("draft_id")`
    ];

    let indexCount = 0;
    for (const index of indexes) {
      try {
        await pool.query(index);
        indexCount++;
      } catch (error) {
        console.log(`  ⚠️  インデックス作成エラー: ${error.message}`);
      }
    }
    console.log(`  ✅ ${indexCount}/${indexes.length} インデックス作成完了`);

    // ステップ4: 外部キー制約の追加
    console.log('\n📋 ステップ4: 外部キー制約を追加中...');
    const constraints = [
      {
        table: 'cot_phases',
        constraint: 'cot_phases_session_id_fkey',
        sql: `ALTER TABLE "cot_phases" ADD CONSTRAINT "cot_phases_session_id_fkey" 
              FOREIGN KEY ("session_id") REFERENCES "cot_sessions"("id") 
              ON DELETE CASCADE ON UPDATE CASCADE`
      },
      {
        table: 'cot_drafts',
        constraint: 'cot_drafts_session_id_fkey',
        sql: `ALTER TABLE "cot_drafts" ADD CONSTRAINT "cot_drafts_session_id_fkey" 
              FOREIGN KEY ("session_id") REFERENCES "cot_sessions"("id") 
              ON DELETE CASCADE ON UPDATE CASCADE`
      },
      {
        table: 'cot_draft_performance',
        constraint: 'cot_draft_performance_draft_id_fkey',
        sql: `ALTER TABLE "cot_draft_performance" ADD CONSTRAINT "cot_draft_performance_draft_id_fkey" 
              FOREIGN KEY ("draft_id") REFERENCES "cot_drafts"("id") 
              ON DELETE CASCADE ON UPDATE CASCADE`
      }
    ];

    for (const fk of constraints) {
      try {
        await pool.query(fk.sql);
        console.log(`  ✅ ${fk.constraint} 追加完了`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  ${fk.constraint} は既に存在します`);
        } else {
          console.log(`  ❌ ${fk.constraint} エラー: ${error.message}`);
        }
      }
    }

    // 最終確認
    console.log('\n📊 最終確認: 作成されたテーブル');
    const finalCheck = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = t.table_name 
         AND table_schema = 'public') as columns,
        (SELECT COUNT(*) FROM information_schema.table_constraints
         WHERE table_name = t.table_name 
         AND table_schema = 'public'
         AND constraint_type = 'FOREIGN KEY') as foreign_keys,
        (SELECT COUNT(*) FROM information_schema.table_constraints
         WHERE table_name = t.table_name 
         AND table_schema = 'public'
         AND constraint_type IN ('UNIQUE', 'PRIMARY KEY')) as constraints
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('cot_sessions', 'cot_phases', 'cot_drafts', 'cot_draft_performance')
      ORDER BY table_name
    `);

    console.table(finalCheck.rows);

    if (finalCheck.rows.length === 4) {
      console.log('\n✅ すべてのCoTテーブルが正常に作成されました！');
      console.log('\n🎉 マイグレーション完了！');
      console.log('📌 次のステップ:');
      console.log('   1. https://x-buzz-flow.vercel.app/viral/cot でCoTシステムにアクセス');
      console.log('   2. 「AI」「教育的」「Twitter」を選択してテスト実行');
    } else {
      console.log('\n⚠️  一部のテーブルが作成されていない可能性があります。');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('詳細:', error);
  } finally {
    await pool.end();
    console.log('\n🔌 データベース接続を終了しました');
  }
}

// 実行
console.log('================================');
console.log('Chain of Thought マイグレーション');
console.log('================================\n');

runCompleteMigration();