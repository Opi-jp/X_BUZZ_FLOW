-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('NEW', 'RETWEET', 'QUOTE');

-- CreateEnum
CREATE TYPE "cot_session_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "cot_phase_step" AS ENUM ('THINK', 'EXECUTE', 'INTEGRATE');

-- CreateEnum
CREATE TYPE "cot_phase_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "cot_draft_status" AS ENUM ('DRAFT', 'EDITED', 'SCHEDULED', 'POSTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "buzz_posts" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author_username" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "likes_count" INTEGER NOT NULL,
    "retweets_count" INTEGER NOT NULL,
    "replies_count" INTEGER NOT NULL,
    "impressions_count" INTEGER NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "media_urls" JSONB NOT NULL,
    "hashtags" JSONB NOT NULL,
    "chroma_id" TEXT,
    "author_followers" INTEGER,
    "author_following" INTEGER,
    "author_verified" BOOLEAN,

    CONSTRAINT "buzz_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "post_type" "PostType" NOT NULL,
    "ref_post_id" TEXT,
    "template_type" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_prompt" TEXT,
    "edited_content" TEXT,
    "posted_at" TIMESTAMP(3),
    "post_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_analytics" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "engagements" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "retweets" INTEGER NOT NULL,
    "replies" INTEGER NOT NULL,
    "profile_clicks" INTEGER NOT NULL,
    "url_clicks" INTEGER NOT NULL,
    "detail_expands" INTEGER NOT NULL,
    "engagement_rate" DOUBLE PRECISION NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "twitter_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_secret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "rss_url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ja',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "importance" DOUBLE PRECISION,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSON,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_threads" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSON,
    "scheduled_at" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3),

    CONSTRAINT "news_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_thread_items" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_thread_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_analyses" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "keywords" TEXT[],
    "topics" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSON NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSON NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "twitter_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "followers" INTEGER,
    "following" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_checked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_tweets" (
    "id" TEXT NOT NULL,
    "watchlist_user_id" TEXT NOT NULL,
    "tweet_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "retweet_count" INTEGER NOT NULL,
    "like_count" INTEGER NOT NULL,
    "reply_count" INTEGER NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_tweets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_history" (
    "id" TEXT NOT NULL,
    "watchlist_user_id" TEXT NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "tweet_id" TEXT,
    "metadata" JSON,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perplexity_reports" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "rawAnalysis" TEXT NOT NULL,
    "trends" JSONB NOT NULL,
    "insights" JSONB NOT NULL,
    "content_angles" JSONB NOT NULL,
    "market_context" JSONB NOT NULL,
    "competitor_activity" JSONB NOT NULL,
    "risk_factors" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perplexity_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cot_sessions" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "cot_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cot_phases" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cot_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cot_drafts" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "concept_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "content" TEXT,
    "threadContent" JSON,
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cot_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cot_draft_performance" (
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
    "last_update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cot_draft_performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buzz_posts_post_id_key" ON "buzz_posts"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_twitter_id_key" ON "users"("twitter_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_url_key" ON "news_articles"("url");

-- CreateIndex
CREATE UNIQUE INDEX "news_analyses_article_id_key" ON "news_analyses"("article_id");

-- CreateIndex
CREATE INDEX "job_queue_status_run_at_idx" ON "job_queue"("status", "run_at");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_users_user_id_twitter_id_key" ON "watchlist_users"("user_id", "twitter_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_tweets_tweet_id_key" ON "watchlist_tweets"("tweet_id");

-- CreateIndex
CREATE INDEX "cot_sessions_status_created_at_idx" ON "cot_sessions"("status", "created_at");

-- CreateIndex
CREATE INDEX "cot_sessions_current_phase_current_step_idx" ON "cot_sessions"("current_phase", "current_step");

-- CreateIndex
CREATE INDEX "cot_phases_session_id_phase_number_idx" ON "cot_phases"("session_id", "phase_number");

-- CreateIndex
CREATE UNIQUE INDEX "cot_phases_session_id_phase_number_key" ON "cot_phases"("session_id", "phase_number");

-- CreateIndex
CREATE INDEX "cot_drafts_session_id_idx" ON "cot_drafts"("session_id");

-- CreateIndex
CREATE INDEX "cot_drafts_status_idx" ON "cot_drafts"("status");

-- CreateIndex
CREATE INDEX "cot_drafts_scheduled_at_idx" ON "cot_drafts"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "cot_drafts_session_id_concept_number_key" ON "cot_drafts"("session_id", "concept_number");

-- CreateIndex
CREATE UNIQUE INDEX "cot_draft_performance_draft_id_key" ON "cot_draft_performance"("draft_id");

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_ref_post_id_fkey" FOREIGN KEY ("ref_post_id") REFERENCES "buzz_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "news_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_thread_items" ADD CONSTRAINT "news_thread_items_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "news_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_thread_items" ADD CONSTRAINT "news_thread_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_analyses" ADD CONSTRAINT "news_analyses_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_users" ADD CONSTRAINT "watchlist_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_tweets" ADD CONSTRAINT "watchlist_tweets_watchlist_user_id_fkey" FOREIGN KEY ("watchlist_user_id") REFERENCES "watchlist_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_history" ADD CONSTRAINT "interaction_history_watchlist_user_id_fkey" FOREIGN KEY ("watchlist_user_id") REFERENCES "watchlist_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cot_phases" ADD CONSTRAINT "cot_phases_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cot_drafts" ADD CONSTRAINT "cot_drafts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cot_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cot_draft_performance" ADD CONSTRAINT "cot_draft_performance_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "cot_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

