-- ニュース記事を独立したテーブルとして管理
CREATE TABLE IF NOT EXISTS "news_articles" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "content" TEXT,
  "source_domain" TEXT NOT NULL,
  "published_date" TIMESTAMP(3),
  "collected_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- メタデータ
  "theme" TEXT,
  "keywords" TEXT[],
  "language" TEXT DEFAULT 'ja',
  
  -- 関連性
  "session_ids" TEXT[],
  "topic_ids" TEXT[],
  
  -- 分析データ
  "sentiment" TEXT,
  "virality_score" DOUBLE PRECISION,
  "engagement_potential" DOUBLE PRECISION,
  
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- URLの重複を防ぐ
CREATE UNIQUE INDEX "news_articles_url_key" ON "news_articles"("url");

-- 検索用インデックス
CREATE INDEX "news_articles_theme_idx" ON "news_articles"("theme");
CREATE INDEX "news_articles_published_date_idx" ON "news_articles"("published_date");
CREATE INDEX "news_articles_source_domain_idx" ON "news_articles"("source_domain");

-- ニュース記事とトピックの関連テーブル
CREATE TABLE IF NOT EXISTS "news_topic_relations" (
  "id" TEXT NOT NULL,
  "news_article_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "topic_data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "news_topic_relations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "news_topic_relations_news_article_id_fkey" FOREIGN KEY ("news_article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE,
  CONSTRAINT "news_topic_relations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "viral_sessions"("id") ON DELETE CASCADE
);

-- 複合インデックス
CREATE INDEX "news_topic_relations_news_session_idx" ON "news_topic_relations"("news_article_id", "session_id");