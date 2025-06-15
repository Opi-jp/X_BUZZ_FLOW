# Claudeセッション管理ガイド

## 🎯 セッション開始時（これだけ実行）

```bash
./scripts/session-restore.sh
```

このコマンドで：
- ✅ 前回の状態を表示
- ✅ 最重要ドキュメントの存在確認
- ✅ 開発環境の状態確認
- ✅ 最新の作業ログ表示
- ✅ 推奨アクションの提示

## 🔥 よくある問題の即解決

### "ECONNREFUSED"エラー
```bash
./scripts/dev-start.sh
```

### ポート競合
```bash
./scripts/cleanup-ports.sh
# オプション3を選択
```

### DB接続エラー
```bash
vercel env pull .env.local
npx prisma generate
```

## 📋 重要ファイル

| ファイル | 用途 | 重要度 |
|---------|------|--------|
| `/docs/chain-of-thought-specification.md` | CoT仕様書（命綱） | ⭐⭐⭐⭐⭐ |
| `/CLAUDE.md` | 作業記録・設計思想 | ⭐⭐⭐⭐⭐ |
| `/docs/cot-implementation-principles.md` | 実装原則 | ⭐⭐⭐⭐ |
| `/docs/testing-principles.md` | テスト原則 | ⭐⭐⭐⭐ |

## 🛠️ 開発コマンド一覧

```bash
# 開発環境
./scripts/dev-start.sh      # すべて起動
./scripts/dev-status.sh     # 状態確認
./scripts/cleanup-ports.sh  # ポート整理

# エラー対応
./scripts/diagnose-error.sh # エラー診断

# DB確認
npx prisma studio          # GUI表示
node scripts/test-db-connection.js

# Phase 1テスト（Perplexity結果をDBに保存）
node scripts/test-db-phase1.js

# 作業ログ
./scripts/auto_log_updater.sh start  # 開始
./scripts/auto_log_updater.sh stop   # 停止
```

## ⚠️ 絶対に避けること

1. **ポート3000以外での起動**
   - 3001, 3002に逃げない
   - 必ず原因を解決

2. **モックデータでの仮テスト**
   - DB接続エラー → 修正する
   - Prismaエラー → 環境を整える

3. **ハードコード**
   - 「過去7日以内」などの固定制限
   - 「必ず3つ」などの強制
   - デフォルト値での回避

## 💡 黄金律

**「エラーが出たら、回避ではなく解決」**

仮の対処は必ずハードコードにつながります。