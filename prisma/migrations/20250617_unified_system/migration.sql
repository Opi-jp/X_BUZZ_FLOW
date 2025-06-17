-- ================================================================
-- Unified System Migration: News + V2 Viral + Self-RT
-- ================================================================

-- 1. Unified News Article Model (既存のnews_articlesを拡張)
-- Note: news_articlesテーブルは既に存在するので、必要なカラムのみ追加
ALTER TABLE "news_articles" 
ADD COLUMN IF NOT EXISTS "category" TEXT,
ADD COLUMN IF NOT EXISTS "importance" DOUBLE PRECISION;

-- 2. Self-RT Management Table
CREATE TABLE IF NOT EXISTS "scheduled_retweets" (
  "id" TEXT NOT NULL,
  "original_post_id" TEXT NOT NULL,
  "original_content" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "rt_strategy" TEXT NOT NULL, -- "6h_spike", "next_day_reminder", etc.
  "add_comment" BOOLEAN NOT NULL DEFAULT false,
  "comment_text" TEXT,
  
  -- Relations
  "viral_draft_id" TEXT,
  "cot_draft_id" TEXT,
  
  -- Execution details
  "executed_at" TIMESTAMP(3),
  "rt_post_id" TEXT,
  "error" TEXT,
  
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "scheduled_retweets_pkey" PRIMARY KEY ("id")
);

-- Add RT status enum values
CREATE TYPE "rt_status" AS ENUM ('SCHEDULED', 'EXECUTED', 'FAILED', 'CANCELLED');
ALTER TABLE "scheduled_retweets" ALTER COLUMN "status" TYPE "rt_status" USING "status"::"rt_status";

-- Add foreign key constraints
ALTER TABLE "scheduled_retweets"
ADD CONSTRAINT "scheduled_retweets_viral_draft_id_fkey" 
  FOREIGN KEY ("viral_draft_id") REFERENCES "viral_drafts_v2"("id") ON DELETE SET NULL,
ADD CONSTRAINT "scheduled_retweets_cot_draft_id_fkey" 
  FOREIGN KEY ("cot_draft_id") REFERENCES "cot_drafts"("id") ON DELETE SET NULL;

-- Indexes for scheduled_retweets
CREATE INDEX "scheduled_retweets_status_scheduled_at_idx" ON "scheduled_retweets"("status", "scheduled_at");
CREATE INDEX "scheduled_retweets_original_post_id_idx" ON "scheduled_retweets"("original_post_id");

-- 3. Unified Performance Tracking
CREATE TABLE IF NOT EXISTS "unified_performance" (
  "id" TEXT NOT NULL,
  "content_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL, -- 'VIRAL_DRAFT', 'COT_DRAFT', 'NEWS_THREAD'
  
  -- Standard metrics (30m, 1h, 24h)
  "metrics_30m" JSONB,
  "metrics_1h" JSONB,
  "metrics_24h" JSONB,
  
  -- Calculated fields
  "engagement_rate" DOUBLE PRECISION,
  "viral_coefficient" DOUBLE PRECISION,
  
  "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "unified_performance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "unified_performance_content_id_key" UNIQUE ("content_id")
);

-- 4. News to Viral Session Relations
CREATE TABLE IF NOT EXISTS "news_viral_relations" (
  "id" TEXT NOT NULL,
  "news_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "relevance_score" DOUBLE PRECISION,
  "used_in_content" BOOLEAN NOT NULL DEFAULT false,
  
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "news_viral_relations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "news_viral_relations_unique" UNIQUE ("news_id", "session_id")
);

-- Add foreign keys for news_viral_relations
ALTER TABLE "news_viral_relations"
ADD CONSTRAINT "news_viral_relations_news_id_fkey" 
  FOREIGN KEY ("news_id") REFERENCES "news_articles"("id") ON DELETE CASCADE,
ADD CONSTRAINT "news_viral_relations_session_id_fkey" 
  FOREIGN KEY ("session_id") REFERENCES "viral_sessions"("id") ON DELETE CASCADE;

-- 5. Character Profile Enhancements
ALTER TABLE "character_profiles"
ADD COLUMN IF NOT EXISTS "preferred_news_categories" TEXT[],
ADD COLUMN IF NOT EXISTS "news_comment_style" JSONB,
ADD COLUMN IF NOT EXISTS "topic_expertise" JSONB;

-- 6. Add source_url to viral_drafts_v2 for news references
ALTER TABLE "viral_drafts_v2"
ADD COLUMN IF NOT EXISTS "source_url" TEXT,
ADD COLUMN IF NOT EXISTS "news_article_id" TEXT;

-- Add foreign key for news article reference
ALTER TABLE "viral_drafts_v2"
ADD CONSTRAINT "viral_drafts_v2_news_article_id_fkey" 
  FOREIGN KEY ("news_article_id") REFERENCES "news_articles"("id") ON DELETE SET NULL;

-- 7. Session Activity Log (for debugging and analytics)
CREATE TABLE IF NOT EXISTS "session_activity_logs" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "session_type" TEXT NOT NULL, -- 'VIRAL', 'COT', 'NEWS'
  "activity_type" TEXT NOT NULL, -- 'API_CALL', 'STATUS_CHANGE', 'ERROR', etc.
  "details" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "session_activity_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes for activity logs
CREATE INDEX "session_activity_logs_session_id_idx" ON "session_activity_logs"("session_id");
CREATE INDEX "session_activity_logs_created_at_idx" ON "session_activity_logs"("created_at");

-- 8. API Error Tracking (for 404/500 debugging)
CREATE TABLE IF NOT EXISTS "api_error_logs" (
  "id" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status_code" INTEGER NOT NULL,
  "error_message" TEXT,
  "stack_trace" TEXT,
  "request_body" JSONB,
  "request_headers" JSONB,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "api_error_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes for error logs
CREATE INDEX "api_error_logs_endpoint_idx" ON "api_error_logs"("endpoint");
CREATE INDEX "api_error_logs_status_code_idx" ON "api_error_logs"("status_code");
CREATE INDEX "api_error_logs_created_at_idx" ON "api_error_logs"("created_at");

-- 9. Create views for easier querying
CREATE OR REPLACE VIEW "active_scheduled_content" AS
SELECT 
  'VIRAL' as type,
  id,
  title,
  scheduled_at,
  status
FROM viral_drafts_v2
WHERE status = 'SCHEDULED' AND scheduled_at > NOW()
UNION ALL
SELECT 
  'COT' as type,
  id,
  title,
  scheduled_at,
  status
FROM cot_drafts
WHERE status = 'SCHEDULED' AND scheduled_at > NOW()
UNION ALL
SELECT 
  'RT' as type,
  id,
  original_content as title,
  scheduled_at,
  status::text
FROM scheduled_retweets
WHERE status = 'SCHEDULED' AND scheduled_at > NOW()
ORDER BY scheduled_at ASC;

-- 10. Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
CREATE TRIGGER update_scheduled_retweets_updated_at BEFORE UPDATE ON "scheduled_retweets"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_performance_updated_at BEFORE UPDATE ON "unified_performance"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON "news_articles"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();