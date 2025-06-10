-- CreateTable
CREATE TABLE "news_analyses" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "japanese_summary" TEXT NOT NULL,
    "key_points" TEXT[],
    "impact" TEXT NOT NULL,
    "analyzed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_queue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSON,
    "result" JSON,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_analyses_article_id_key" ON "news_analyses"("article_id");

-- CreateIndex
CREATE INDEX "news_analyses_category_idx" ON "news_analyses"("category");

-- CreateIndex
CREATE INDEX "news_analyses_impact_idx" ON "news_analyses"("impact");

-- CreateIndex
CREATE INDEX "job_queue_type_status_idx" ON "job_queue"("type", "status");

-- CreateIndex
CREATE INDEX "job_queue_created_at_idx" ON "job_queue"("created_at");

-- AddForeignKey
ALTER TABLE "news_analyses" ADD CONSTRAINT "news_analyses_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
