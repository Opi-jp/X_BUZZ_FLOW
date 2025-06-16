# DBとフロントエンドの一貫性維持ガイド

## 問題の背景

DB接続の問題をスクリプトで回避してきた結果、以下の問題が発生：
1. DBスキーマとPrismaスキーマの不一致
2. TypeScript型定義とDBカラムの不一致
3. フロントエンドのフォームフィールドとDBフィールドの不一致
4. デバッグが困難（例：Twitter認証のcreatedAtカラム問題）

## 検証ツール

### 1. DBスキーマバリデーター
```bash
node scripts/db-schema-validator.js
```
- DBの実際の構造とPrismaスキーマを比較
- 必須カラムの存在確認
- インデックスの確認
- 特にusersテーブルのcreatedAt/updatedAtをチェック

### 2. DB-フロントエンド同期チェッカー
```bash
node scripts/db-frontend-sync-check.js
```
- TypeScript型定義とDBカラムの比較
- APIルートでのフィールド使用状況
- フォームフィールドとDBの一致確認

## よくある不一致パターン

### 1. 命名規則の不一致
- **DB**: snake_case（例：created_at, session_id）
- **TypeScript**: camelCase（例：createdAt, sessionId）
- **Prisma**: @map()で変換

```prisma
createdAt DateTime @default(now()) @map("created_at")
```

### 2. カラムの存在しない問題
**症状**: 
- 認証失敗
- データ保存エラー
- 予期しないnull値

**原因**:
- マイグレーション未実行
- 手動でのテーブル作成
- Prismaスキーマとの不一致

**解決方法**:
```sql
-- 例：usersテーブルにcreatedAtを追加
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
```

### 3. 型の不一致
**TypeScript**:
```typescript
interface User {
  id: string
  createdAt: Date
}
```

**DB**:
```sql
id UUID
created_at TIMESTAMP WITH TIME ZONE
```

## ベストプラクティス

### 1. マイグレーションの正しい使用
```bash
# 1. スキーマ変更後
npx prisma migrate dev --name describe_change

# 2. 本番環境
npx prisma migrate deploy
```

### 2. 型の自動生成
```bash
# Prisma型を生成
npx prisma generate

# 使用
import { User, CotSession } from '@prisma/client'
```

### 3. 定期的な検証
```bash
# 開発開始時に実行
npm run validate:db

# package.jsonに追加
"scripts": {
  "validate:db": "node scripts/db-schema-validator.js && node scripts/db-frontend-sync-check.js"
}
```

### 4. エラーハンドリング
```typescript
// DBエラーを明確にキャッチ
try {
  await prisma.user.create({ data })
} catch (error) {
  if (error.code === 'P2002') {
    // ユニーク制約違反
  } else if (error.code === 'P2003') {
    // 外部キー制約違反
  }
  console.error('DB Error:', error.meta)
}
```

## トラブルシューティング

### 認証が失敗する場合
1. `db-schema-validator.js`を実行
2. usersテーブルのcreatedAt/updatedAtを確認
3. 必要に応じてカラムを追加

### データが保存されない場合
1. `db-frontend-sync-check.js`を実行
2. フィールド名の不一致を確認
3. Prismaスキーマの@mapディレクティブを確認

### 非同期処理が動かない場合
1. api_tasksテーブルの存在確認
2. session_idカラムがsnake_caseか確認
3. ワーカーのログでエラー詳細を確認

## 監視とメンテナンス

### 定期チェックリスト
- [ ] 週次: スキーマ検証ツールの実行
- [ ] PR時: 型定義とDBの一致確認
- [ ] デプロイ前: マイグレーション確認

### CI/CDへの組み込み
```yaml
# .github/workflows/db-check.yml
- name: Validate DB Schema
  run: |
    npm run validate:db
    npm run type-check
```

## まとめ

DBとフロントエンドの不一致は、開発速度を大幅に低下させ、予期しないバグの原因となります。定期的な検証と、一貫性のある命名規則の維持が重要です。