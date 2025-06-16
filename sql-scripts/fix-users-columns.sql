-- usersテーブルのカラム名を修正（snake_case → camelCase）
-- 既存のcreated_atとupdated_atをcreatedAtとupdatedAtにリネーム

-- まず既存のcreatedAtとupdatedAtカラムがある場合は削除
ALTER TABLE users DROP COLUMN IF EXISTS "createdAt";
ALTER TABLE users DROP COLUMN IF EXISTS "updatedAt";

-- created_at を createdAt にリネーム
ALTER TABLE users RENAME COLUMN created_at TO "createdAt";

-- updated_at を updatedAt にリネーム
ALTER TABLE users RENAME COLUMN updated_at TO "updatedAt";

-- updatedAtカラムにデフォルト値を設定
ALTER TABLE users ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- updatedAtの自動更新トリガーを作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 既存のトリガーを削除して再作成
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();