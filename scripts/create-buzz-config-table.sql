-- BuzzConfigテーブルを作成
CREATE TABLE IF NOT EXISTS "buzz_config" (
  "id" TEXT PRIMARY KEY,
  "keywords" TEXT[] NOT NULL,
  "accounts" TEXT[] NOT NULL,
  "min_engagement" INTEGER NOT NULL,
  "min_impressions" INTEGER NOT NULL,
  "collect_interval" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- デフォルト設定を挿入
INSERT INTO "buzz_config" ("id", "keywords", "accounts", "min_engagement", "min_impressions", "collect_interval", "enabled")
VALUES (
  'default',
  ARRAY['AI', '働き方', 'ChatGPT', 'LLM', '生成AI', 'Claude'],
  ARRAY['@openai', '@anthropic', '@Google'],
  1000,
  5000,
  60,
  false
) ON CONFLICT ("id") DO NOTHING;