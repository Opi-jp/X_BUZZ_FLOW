-- viral_sessionsテーブルにDB主導フロー管理用のフィールドを追加
ALTER TABLE viral_sessions
ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS step_status JSONB,
ADD COLUMN IF NOT EXISTS post_format VARCHAR(50) DEFAULT 'single';

-- 既存データの更新（必要に応じて）
UPDATE viral_sessions
SET current_step = 1
WHERE current_step IS NULL;

UPDATE viral_sessions
SET post_format = 'single'
WHERE post_format IS NULL;