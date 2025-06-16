-- expertiseカラムをthemeにリネーム
ALTER TABLE "cot_sessions" 
RENAME COLUMN "expertise" TO "theme";