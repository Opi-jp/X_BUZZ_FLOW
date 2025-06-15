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
