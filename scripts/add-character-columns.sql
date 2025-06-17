-- viral_sessions テーブルにキャラクター関連カラムを追加
ALTER TABLE viral_sessions 
ADD COLUMN IF NOT EXISTS character_profile_id TEXT,
ADD COLUMN IF NOT EXISTS voice_style_mode TEXT;

-- 外部キー制約を追加（character_profilesテーブルが存在する場合）
-- ALTER TABLE viral_sessions
-- ADD CONSTRAINT fk_character_profile
-- FOREIGN KEY (character_profile_id) 
-- REFERENCES character_profiles(id);