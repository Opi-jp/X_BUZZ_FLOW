-- CoT関連のEnum型を作成
DO $$ BEGIN
  CREATE TYPE "cot_session_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "cot_phase_step" AS ENUM ('THINK', 'EXECUTE', 'INTEGRATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "cot_phase_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "cot_draft_status" AS ENUM ('DRAFT', 'EDITED', 'SCHEDULED', 'POSTED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CoTセッションテーブル
CREATE TABLE IF NOT EXISTS "cot_sessions" (
  "id" TEXT NOT NULL,
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
);

-- CoTフェーズテーブル
CREATE TABLE IF NOT EXISTS "cot_phases" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "phase_number" INTEGER NOT NULL,
  "think_prompt" TEXT,
  "think_result" JSON,
  "think_tokens" INTEGER DEFAULT 0,
  "think_at" TIMESTAMP(3),
  "execute_result" JSON,
  "execute_duration" INTEGER DEFAULT 0,
  "execute_at" TIMESTAMP(3),
  "integrate_prompt" TEXT,
  "integrate_result" JSON,
  "integrate_tokens" INTEGER DEFAULT 0,
  "integrate_at" TIMESTAMP(3),
  "status" "cot_phase_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cot_phases_pkey" PRIMARY KEY ("id")
);

-- CoTドラフトテーブル
CREATE TABLE IF NOT EXISTS "cot_drafts" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "concept_number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "hook" TEXT NOT NULL,
  "angle" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "content" TEXT,
  "thread_content" JSON,
  "visual_guide" TEXT,
  "timing" TEXT NOT NULL,
  "hashtags" TEXT[],
  "news_source" TEXT,
  "source_url" TEXT,
  "kpis" JSON,
  "risk_assessment" JSON,
  "optimization_tips" JSON,
  "status" "cot_draft_status" NOT NULL DEFAULT 'DRAFT',
  "edited_content" TEXT,
  "scheduled_at" TIMESTAMP(3),
  "posted_at" TIMESTAMP(3),
  "post_id" TEXT,
  "viral_score" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cot_drafts_pkey" PRIMARY KEY ("id")
);

-- CoTドラフトパフォーマンステーブル
CREATE TABLE IF NOT EXISTS "cot_draft_performance" (
  "id" TEXT NOT NULL,
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
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS "cot_sessions_status_created_at_idx" ON "cot_sessions"("status", "created_at");
CREATE INDEX IF NOT EXISTS "cot_sessions_current_phase_current_step_idx" ON "cot_sessions"("current_phase", "current_step");
CREATE INDEX IF NOT EXISTS "cot_phases_session_id_phase_number_idx" ON "cot_phases"("session_id", "phase_number");
CREATE UNIQUE INDEX IF NOT EXISTS "cot_phases_session_id_phase_number_key" ON "cot_phases"("session_id", "phase_number");
CREATE INDEX IF NOT EXISTS "cot_drafts_session_id_idx" ON "cot_drafts"("session_id");
CREATE INDEX IF NOT EXISTS "cot_drafts_status_idx" ON "cot_drafts"("status");
CREATE INDEX IF NOT EXISTS "cot_drafts_scheduled_at_idx" ON "cot_drafts"("scheduled_at");
CREATE UNIQUE INDEX IF NOT EXISTS "cot_drafts_session_id_concept_number_key" ON "cot_drafts"("session_id", "concept_number");
CREATE UNIQUE INDEX IF NOT EXISTS "cot_draft_performance_draft_id_key" ON "cot_draft_performance"("draft_id");

-- 外部キー制約を追加（エラーが出ても無視）
DO $$ BEGIN
  ALTER TABLE "cot_phases" ADD CONSTRAINT "cot_phases_session_id_fkey" 
  FOREIGN KEY ("session_id") REFERENCES "cot_sessions"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "cot_drafts" ADD CONSTRAINT "cot_drafts_session_id_fkey" 
  FOREIGN KEY ("session_id") REFERENCES "cot_sessions"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "cot_draft_performance" ADD CONSTRAINT "cot_draft_performance_draft_id_fkey" 
  FOREIGN KEY ("draft_id") REFERENCES "cot_drafts"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 確認用：作成されたテーブルを表示
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cot_sessions', 'cot_phases', 'cot_drafts', 'cot_draft_performance')
ORDER BY table_name;