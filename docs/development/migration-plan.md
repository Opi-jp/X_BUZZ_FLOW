# Chain of Thought データベースマイグレーション計画

## 概要
- 既存のニュース・バズ投稿システムを保持
- Chain of Thought用の新しいテーブル構造に移行
- Vercel環境での最適化

## マイグレーション戦略

### Step 1: バックアップ作成
```bash
# 既存スキーマのバックアップ
cp prisma/schema.prisma prisma/schema-backup-$(date +%Y%m%d).prisma
```

### Step 2: 新スキーマの適用
```bash
# 新しいスキーマに置き換え
cp prisma/schema-merged.prisma prisma/schema.prisma
```

### Step 3: 古いCoTテーブルの削除
既存の不整合なCoTテーブルを削除：
```sql
-- 既存の不完全なCoTテーブルを削除
DROP TABLE IF EXISTS cot_drafts CASCADE;
DROP TABLE IF EXISTS cot_sessions CASCADE;

-- 古いEnumも削除
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS phase_step CASCADE;
```

### Step 4: Prisma Client再生成
```bash
npx prisma generate
```

### Step 5: データベース同期
```bash
npx prisma db push
```

### Step 6: 新しいCoTテーブルの作成確認
```sql
-- 新しいテーブルが正しく作成されたか確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'cot_%';
```

## 影響範囲

### 保持されるデータ
- ✅ BuzzPost（バズ投稿）
- ✅ ScheduledPost（投稿予約）
- ✅ NewsArticle（ニュース記事）
- ✅ NewsSource（ニュースソース）
- ✅ User（ユーザー）
- ✅ 全ての既存ニュース・投稿関連データ

### 削除されるデータ
- ❌ 既存の不完全なcot_sessions
- ❌ 既存の不完全なcot_drafts
- ❌ 古い/不正な型定義

### 新規作成されるテーブル
- 🆕 cot_sessions（新設計）
- 🆕 cot_phases（新規）
- 🆕 cot_drafts（新設計）
- 🆕 cot_draft_performance（新規）

## 実行手順

### 安全な実行のための確認事項
1. **環境変数の確認**
   ```bash
   echo $DATABASE_URL
   echo $DIRECT_URL
   ```

2. **バックアップの作成**
   ```bash
   # データベース全体のバックアップ（推奨）
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```

3. **ローカルでのテスト**
   ```bash
   # ローカル環境で先にテスト
   npm run db:push:local
   ```

### Vercel環境での実行
```bash
# 1. スキーマ置換
cp prisma/schema-merged.prisma prisma/schema.prisma

# 2. Prisma Client再生成
npx prisma generate

# 3. データベース同期
npx prisma db push

# 4. 動作確認
npm run build
```

## ロールバック計画

問題が発生した場合：
```bash
# 1. 古いスキーマに戻す
cp prisma/schema-backup-$(date +%Y%m%d).prisma prisma/schema.prisma

# 2. Prisma Client再生成
npx prisma generate

# 3. データベース同期
npx prisma db push
```

## テスト計画

### マイグレーション後の確認事項
1. **既存機能のテスト**
   - ニュース収集機能
   - バズ投稿機能
   - ユーザー認証

2. **新CoT機能のテスト**
   - セッション作成
   - Phase 1-5の実行
   - 下書き生成

3. **API互換性の確認**
   - 既存APIエンドポイント
   - 新CoT APIエンドポイント

## 成功条件
- ✅ 既存データの保持
- ✅ 既存機能の正常動作
- ✅ 新CoTテーブルの正常作成
- ✅ Vercelでのビルド成功
- ✅ TypeScriptエラーなし