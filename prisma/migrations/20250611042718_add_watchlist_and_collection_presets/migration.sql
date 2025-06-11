-- CreateTable
CREATE TABLE "collection_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "query" TEXT NOT NULL,
    "keywords" TEXT[],
    "minLikes" INTEGER NOT NULL DEFAULT 100,
    "minRetweets" INTEGER NOT NULL DEFAULT 50,
    "language" TEXT NOT NULL DEFAULT 'ja',
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_users" (
    "id" TEXT NOT NULL,
    "twitter_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "profile_image" TEXT,
    "bio" TEXT,
    "followers_count" INTEGER NOT NULL,
    "category" TEXT[],
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_following" BOOLEAN NOT NULL DEFAULT false,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_checked" TIMESTAMP(3),

    CONSTRAINT "watchlist_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_tweets" (
    "id" TEXT NOT NULL,
    "tweet_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "likes_count" INTEGER NOT NULL,
    "retweets_count" INTEGER NOT NULL,
    "replies_count" INTEGER NOT NULL,
    "impressions_count" INTEGER NOT NULL,
    "has_replied" BOOLEAN NOT NULL DEFAULT false,
    "has_quoted" BOOLEAN NOT NULL DEFAULT false,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "media_urls" JSONB,

    CONSTRAINT "watchlist_tweets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_history" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source_tweet_id" TEXT NOT NULL,
    "target_tweet_id" TEXT,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_users_twitter_id_key" ON "watchlist_users"("twitter_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_tweets_tweet_id_key" ON "watchlist_tweets"("tweet_id");

-- AddForeignKey
ALTER TABLE "watchlist_tweets" ADD CONSTRAINT "watchlist_tweets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "watchlist_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
