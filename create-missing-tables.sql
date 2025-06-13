-- accountsテーブルの作成（NextAuth用）
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_account_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id);

-- news_analysis_jobsテーブルの作成
CREATE TABLE IF NOT EXISTS news_analysis_jobs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP(3),
    completed_at TIMESTAMP(3),
    error TEXT,
    result JSONB,
    metadata JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS news_analysis_jobs_status_idx ON news_analysis_jobs(status);
CREATE INDEX IF NOT EXISTS news_analysis_jobs_type_idx ON news_analysis_jobs(type);

-- news_analysis_resultsテーブルの作成
CREATE TABLE IF NOT EXISTS news_analysis_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    importance_score DOUBLE PRECISION NOT NULL,
    category TEXT NOT NULL,
    summary_ja TEXT NOT NULL,
    key_points JSONB NOT NULL,
    impact_assessment TEXT NOT NULL,
    expert_perspective TEXT,
    metadata JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES news_analysis_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS news_analysis_results_job_id_idx ON news_analysis_results(job_id);
CREATE INDEX IF NOT EXISTS news_analysis_results_article_id_idx ON news_analysis_results(article_id);
CREATE INDEX IF NOT EXISTS news_analysis_results_importance_score_idx ON news_analysis_results(importance_score DESC);