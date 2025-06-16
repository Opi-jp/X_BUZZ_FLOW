-- GptAnalysisテーブルの作成
CREATE TABLE IF NOT EXISTS gpt_analyses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response JSONB NOT NULL,
    tokens INTEGER,
    duration INTEGER,
    metadata JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS gpt_analyses_analysis_type_idx ON gpt_analyses(analysis_type);

-- ContentDraftテーブルの作成
CREATE TABLE IF NOT EXISTS content_drafts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id TEXT NOT NULL,
    concept_type TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    explanation TEXT NOT NULL,
    buzz_factors TEXT[] NOT NULL,
    target_audience TEXT NOT NULL,
    estimated_engagement JSONB NOT NULL,
    hashtags TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    edited_content TEXT,
    editor_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES gpt_analyses(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS content_drafts_analysis_id_status_idx ON content_drafts(analysis_id, status);
CREATE INDEX IF NOT EXISTS content_drafts_concept_type_category_idx ON content_drafts(concept_type, category);

-- PromptTemplateテーブルの作成
CREATE TABLE IF NOT EXISTS prompt_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    template TEXT NOT NULL,
    variables JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS prompt_templates_type_is_active_idx ON prompt_templates(type, is_active);