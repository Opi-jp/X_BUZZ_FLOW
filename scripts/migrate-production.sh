#!/bin/bash

echo "本番環境のマイグレーションを実行するには、以下の手順を実行してください："
echo ""
echo "1. Supabaseダッシュボードにアクセス"
echo "   https://app.supabase.com/project/YOUR_PROJECT_ID"
echo ""
echo "2. SQL Editorで以下のSQLを実行："
echo ""
echo "-- バイラルコンテンツシステム用テーブル"
echo ""
cat << 'EOF'
-- viral_opportunities
CREATE TABLE IF NOT EXISTS viral_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  platform TEXT NOT NULL,
  viral_score DOUBLE PRECISION NOT NULL,
  time_window INTEGER NOT NULL,
  angle TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  source_data JSONB DEFAULT '{}',
  status TEXT NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_viral_opportunities_platform_status ON viral_opportunities(platform, status);
CREATE INDEX idx_viral_opportunities_viral_score ON viral_opportunities(viral_score);

-- viral_posts
CREATE TABLE IF NOT EXISTS viral_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES viral_opportunities(id),
  concept_type TEXT NOT NULL,
  content TEXT NOT NULL,
  thread_content JSONB,
  visual_guide TEXT,
  hashtags TEXT[] DEFAULT '{}',
  post_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  post_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_viral_posts_opportunity_id ON viral_posts(opportunity_id);
CREATE INDEX idx_viral_posts_scheduled_at ON viral_posts(scheduled_at);

-- viral_post_performance
CREATE TABLE IF NOT EXISTS viral_post_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID UNIQUE NOT NULL REFERENCES viral_posts(id),
  impressions_30m INTEGER,
  likes_30m INTEGER,
  retweets_30m INTEGER,
  comments_30m INTEGER,
  impressions_1h INTEGER,
  likes_1h INTEGER,
  retweets_1h INTEGER,
  comments_1h INTEGER,
  impressions_24h INTEGER,
  likes_24h INTEGER,
  retweets_24h INTEGER,
  comments_24h INTEGER,
  followers_24h INTEGER,
  engagement_rate DOUBLE PRECISION,
  viral_coefficient DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- viral_analysis_logs
CREATE TABLE IF NOT EXISTS viral_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  phase TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response JSONB NOT NULL DEFAULT '{}',
  tokens INTEGER,
  duration INTEGER,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_viral_analysis_logs_model_phase ON viral_analysis_logs(model, phase);

-- viral_config
CREATE TABLE IF NOT EXISTS viral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
EOF