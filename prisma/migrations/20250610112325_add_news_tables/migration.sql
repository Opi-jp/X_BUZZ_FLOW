-- CreateTable
CREATE TABLE "news_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "importance" DOUBLE PRECISION,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_threads" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "main_tweet_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_items" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_thread_items" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "tweet_content" TEXT NOT NULL,
    "tweet_id" TEXT,
    "parent_tweet_id" TEXT,
    "posted_at" TIMESTAMP(3),

    CONSTRAINT "news_thread_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_url_key" ON "news_articles"("url");

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "news_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_thread_items" ADD CONSTRAINT "news_thread_items_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "news_threads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_thread_items" ADD CONSTRAINT "news_thread_items_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
