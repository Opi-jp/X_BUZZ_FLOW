-- Check if threadContent column exists in cot_drafts table
-- If not, add it as JSONB column

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='cot_drafts' AND column_name='threadcontent'
    ) THEN
        ALTER TABLE cot_drafts ADD COLUMN threadContent JSONB;
    END IF;
END $$;

-- Show the current structure of cot_drafts table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cot_drafts'
ORDER BY ordinal_position;