-- Create enum types
CREATE TYPE session_status AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED', 'PAUSED');
CREATE TYPE phase_step AS ENUM ('THINK', 'EXECUTE', 'INTEGRATE');
CREATE TYPE draft_status AS ENUM ('DRAFT', 'EDITED', 'SCHEDULED', 'POSTED', 'CANCELLED');

-- Create cot_sessions table
CREATE TABLE IF NOT EXISTS cot_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_type TEXT NOT NULL,
    config JSONB NOT NULL,
    status session_status DEFAULT 'PENDING',
    current_phase INTEGER DEFAULT 1,
    current_step phase_step DEFAULT 'THINK',
    phases JSONB,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMP(3),
    should_complete_by TIMESTAMP(3),
    is_timed_out BOOLEAN DEFAULT false,
    total_tokens INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP(3)
);

-- Create indexes for cot_sessions
CREATE INDEX IF NOT EXISTS cot_sessions_status_next_retry_at_idx ON cot_sessions(status, next_retry_at);
CREATE INDEX IF NOT EXISTS cot_sessions_created_at_idx ON cot_sessions(created_at);

-- Create cot_drafts table
CREATE TABLE IF NOT EXISTS cot_drafts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_id TEXT NOT NULL,
    concept_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    hook TEXT NOT NULL,
    angle TEXT NOT NULL,
    structure JSONB NOT NULL,
    visual TEXT,
    timing TEXT NOT NULL,
    hashtags TEXT[] NOT NULL,
    opportunity TEXT NOT NULL,
    platform TEXT NOT NULL,
    format TEXT NOT NULL,
    expected_reaction TEXT NOT NULL,
    status draft_status DEFAULT 'DRAFT',
    edited_content TEXT,
    scheduled_at TIMESTAMP(3),
    posted_at TIMESTAMP(3),
    post_id TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES cot_sessions(id) ON DELETE CASCADE
);

-- Create indexes for cot_drafts
CREATE INDEX IF NOT EXISTS cot_drafts_session_id_idx ON cot_drafts(session_id);
CREATE INDEX IF NOT EXISTS cot_drafts_status_idx ON cot_drafts(status);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cot_sessions_updated_at BEFORE UPDATE ON cot_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cot_drafts_updated_at BEFORE UPDATE ON cot_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();