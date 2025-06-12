const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL環境変数が設定されていません');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('データベースに接続しました');

    // GptAnalysisテーブルを作成
    const createGptAnalysisTable = `
      CREATE TABLE IF NOT EXISTS gpt_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_type VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        response JSONB NOT NULL DEFAULT '{}',
        tokens INTEGER,
        duration INTEGER,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_gpt_analyses_type ON gpt_analyses(analysis_type);
      CREATE INDEX IF NOT EXISTS idx_gpt_analyses_created ON gpt_analyses(created_at);
    `;

    await client.query(createGptAnalysisTable);
    console.log('✅ gpt_analysesテーブルを作成しました');

    // ContentDraftテーブルを作成
    const createContentDraftTable = `
      CREATE TABLE IF NOT EXISTS content_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id UUID NOT NULL,
        concept_type VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        edited_content TEXT,
        explanation TEXT,
        buzz_factors JSONB DEFAULT '[]',
        target_audience TEXT,
        estimated_engagement JSONB DEFAULT '{}',
        hashtags JSONB DEFAULT '[]',
        visual_guide TEXT,
        platform VARCHAR(50) DEFAULT 'Twitter',
        format VARCHAR(50) DEFAULT 'single',
        status VARCHAR(50) DEFAULT 'draft',
        editor_notes TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (analysis_id) REFERENCES gpt_analyses(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_content_drafts_analysis ON content_drafts(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(analysis_id, status);
      CREATE INDEX IF NOT EXISTS idx_content_drafts_type ON content_drafts(concept_type, category);
    `;

    await client.query(createContentDraftTable);
    console.log('✅ content_draftsテーブルを作成しました');

    // PromptTemplateテーブルを作成
    const createPromptTemplateTable = `
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        template TEXT NOT NULL,
        variables JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_prompt_templates_type ON prompt_templates(type, is_active);
    `;

    await client.query(createPromptTemplateTable);
    console.log('✅ prompt_templatesテーブルを作成しました');

    // 更新日時の自動更新トリガーを作成
    const createUpdateTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_gpt_analyses_updated_at BEFORE UPDATE ON gpt_analyses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_content_drafts_updated_at BEFORE UPDATE ON content_drafts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await client.query(createUpdateTrigger);
    console.log('✅ 更新日時の自動更新トリガーを作成しました');

    console.log('\n✅ すべてのテーブルの作成が完了しました！');

  } catch (error) {
    console.error('マイグレーションエラー:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();