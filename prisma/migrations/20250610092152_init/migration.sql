-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('NEW', 'RETWEET', 'QUOTE');

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
    "scheduled_post_id" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "retweets" INTEGER NOT NULL,
    "replies" INTEGER NOT NULL,
    "profile_clicks" INTEGER NOT NULL,
    "link_clicks" INTEGER NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "engagement_rate" DOUBLE PRECISION NOT NULL,
    "ai_analysis" TEXT,

    CONSTRAINT "post_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt_template" TEXT NOT NULL,
    "example_output" TEXT NOT NULL,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "buzz_posts_post_id_key" ON "buzz_posts"("post_id");

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_ref_post_id_fkey" FOREIGN KEY ("ref_post_id") REFERENCES "buzz_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_scheduled_post_id_fkey" FOREIGN KEY ("scheduled_post_id") REFERENCES "scheduled_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
