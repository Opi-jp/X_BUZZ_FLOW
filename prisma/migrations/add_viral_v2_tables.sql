-- 新しいシンプルなV2システムのテーブル作成

-- ViralSessionテーブル
CREATE TABLE IF NOT EXISTS viral_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  theme TEXT NOT NULL,
  platform TEXT NOT NULL,
  style TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Step 1の結果
  topics JSONB,
  
  -- Step 2の結果
  concepts JSONB,
  selected_ids TEXT[] DEFAULT '{}',
  
  -- Step 3の結果
  contents JSONB
);

-- ViralDraftV2テーブル
CREATE TABLE IF NOT EXISTS viral_drafts_v2 (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id TEXT NOT NULL,
  
  -- コンテンツ情報
  concept_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[],
  visual_note TEXT,
  
  -- 投稿情報
  status TEXT NOT NULL DEFAULT 'DRAFT',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  tweet_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- 外部キー制約
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES viral_sessions(id) ON DELETE CASCADE
);

-- ViralDraftPerformanceテーブル
CREATE TABLE IF NOT EXISTS viral_draft_performance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  draft_id TEXT UNIQUE NOT NULL,
  
  -- 30分後
  likes_30m INTEGER,
  retweets_30m INTEGER,
  replies_30m INTEGER,
  impressions_30m INTEGER,
  
  -- 1時間後
  likes_1h INTEGER,
  retweets_1h INTEGER,
  replies_1h INTEGER,
  impressions_1h INTEGER,
  
  -- 24時間後
  likes_24h INTEGER,
  retweets_24h INTEGER,
  replies_24h INTEGER,
  impressions_24h INTEGER,
  
  -- 計算フィールド
  engagement_rate FLOAT,
  viral_coefficient FLOAT,
  
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- 外部キー制約
  CONSTRAINT fk_draft FOREIGN KEY (draft_id) REFERENCES viral_drafts_v2(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_viral_sessions_status ON viral_sessions(status);
CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_session_id ON viral_drafts_v2(session_id);
CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_status ON viral_drafts_v2(status);
CREATE INDEX IF NOT EXISTS idx_viral_drafts_v2_scheduled_at ON viral_drafts_v2(scheduled_at);

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_viral_drafts_v2_updated_at BEFORE UPDATE ON viral_drafts_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viral_draft_performance_updated_at BEFORE UPDATE ON viral_draft_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();