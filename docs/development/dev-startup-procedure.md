# 開発環境起動手順

## 🚀 開発開始時の標準手順

### 1. 環境状態の確認
```bash
./scripts/dev-status.sh
```

### 2. ポート競合がある場合
```bash
./scripts/cleanup-ports.sh
# オプション3（すべて停止）を選択
```

### 3. 開発サーバーの起動
```bash
# ターミナル1
npm run dev
# 必ず http://localhost:3000 で起動することを確認

# ターミナル2（別タブ）
npx prisma studio
# http://localhost:5555 で起動
```

### 4. DB接続の確認
```bash
# ターミナル3
node scripts/test-db-connection.js
```

## ⚠️ よくある問題と対処法

### Port 3000 is already in use
```bash
# 原因: 前回のサーバーが残っている or 複数起動
./scripts/cleanup-ports.sh
# オプション1を選択してNext.jsサーバーをクリア
```

### Prisma Client cannot connect
```bash
# 原因1: ポートが異なる
# 確認: 必ず localhost:3000 で開発サーバーが動いているか確認

# 原因2: 環境変数の不一致
cat .env.local | grep DATABASE_URL
# Vercelから最新の環境変数を取得
vercel env pull .env.local
```

### 複数ターミナルでの混乱
```bash
# すべてのプロセスを確認
ps aux | grep node
ps aux | grep next

# または
./scripts/dev-status.sh
```

## 📋 チェックリスト

開発開始前に必ず確認：

- [ ] `./scripts/dev-status.sh` で環境確認
- [ ] ポート3000が空いている
- [ ] ポート5555が空いている
- [ ] .env.localが最新
- [ ] `npm run dev` は必ず3000番で起動
- [ ] 複数のNext.jsサーバーが起動していない

## 🛠️ トラブルシューティング

### すべてリセットしたい場合
```bash
# 1. すべてのサーバーを停止
./scripts/cleanup-ports.sh
# オプション3を選択

# 2. node_modulesをクリア（必要な場合）
rm -rf node_modules
npm install

# 3. Prismaクライアントを再生成
npx prisma generate

# 4. 環境変数を最新に
vercel env pull .env.local

# 5. 開発サーバーを起動
npm run dev
```

## 💡 ベストプラクティス

1. **1つのポートで1つのサーバー**
   - 3000: Next.js開発サーバー（1つだけ）
   - 5555: Prisma Studio（1つだけ）

2. **ターミナルの管理**
   - ターミナル1: Next.js専用
   - ターミナル2: Prisma Studio専用
   - ターミナル3: スクリプト実行用

3. **定期的な確認**
   - 作業開始時: `./scripts/dev-status.sh`
   - エラー発生時: ポート競合を疑う
   - 長時間作業後: プロセスの確認

## 🎯 ゴールデンルール

**「ポート3000で動かない場合は、必ず原因を解決する」**

3001や3002に逃げると、後でDB接続エラーやAPI呼び出しエラーの原因になります。