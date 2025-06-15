# DB接続・保存チェックリスト

## テスト開始前の確認

### 1. 環境変数の確認
```bash
# .env.localに必要な変数があるか確認
cat .env.local | grep DATABASE_URL
cat .env.local | grep DIRECT_URL
```

### 2. Prisma Studioで接続確認
```bash
npx prisma studio
# ブラウザで http://localhost:5555 を開いて接続確認
```

### 3. DB保存テストスクリプトの実行
```bash
node scripts/test-db-phase1.js
# 成功したらセッションIDをメモ
```

## フェーズごとのDB保存確認

### Phase 1
- [ ] thinkResultが保存されているか
- [ ] executeResultが保存されているか
- [ ] perplexityResponsesが保存されているか
- [ ] 日付・URLが含まれているか

### Phase 2-5
- [ ] 前フェーズの結果を読み込めるか
- [ ] 各フェーズの結果が保存されるか

## よくある問題と対処

### 1. "Cannot read properties of undefined"
```javascript
// ❌ 悪い例：仮データで進める
const mockData = { opportunities: [...] }

// ✅ 良い例：DB接続を修正
await prisma.$connect()
const data = await prisma.cotPhase.findUnique(...)
```

### 2. "Prisma Client is not connected"
```javascript
// テスト前に必ず接続確認
const prisma = new PrismaClient()
await prisma.$connect()
```

### 3. "Record not found"
```javascript
// 存在確認してから処理
const phase = await prisma.cotPhase.findUnique(...)
if (!phase) {
  console.log('Phase not found - creating test data first')
  // test-db-phase1.jsを実行
}
```

## 仮テストの誘惑を避ける

### ❌ やってはいけないこと
1. DB接続エラー → モックデータで代用
2. 保存エラー → console.logだけで続行
3. 読み込みエラー → 固定データを使用

### ✅ 正しいアプローチ
1. DB接続エラー → 接続問題を解決
2. 保存エラー → スキーマや権限を確認
3. 読み込みエラー → テストデータを作成

## コマンド一覧

```bash
# DB接続テスト
node scripts/test-db-connection.js

# Phase 1保存テスト
node scripts/test-db-phase1.js

# 既存セッションでPhase 2テスト
SESSION_ID=xxx node scripts/test-phase2-with-db.js

# Prisma Studio
npx prisma studio

# スキーマ同期
npx prisma generate
npx prisma db push
```

## 重要な原則

**「DBに保存できない」は「実装が間違っている」のサイン**

仮テストで進めると、必ずハードコードが生まれます。
DB保存を確実に行うことが、正しい実装への第一歩です。