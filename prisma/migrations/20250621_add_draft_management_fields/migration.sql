-- Add draft management fields to viral_drafts_v2
ALTER TABLE "viral_drafts_v2" 
ADD COLUMN IF NOT EXISTS "edited_content" TEXT,
ADD COLUMN IF NOT EXISTS "is_edited" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "source_tweets" JSONB,
ADD COLUMN IF NOT EXISTS "thread_structure" JSONB,
ADD COLUMN IF NOT EXISTS "post_history" JSONB DEFAULT '[]'::jsonb;