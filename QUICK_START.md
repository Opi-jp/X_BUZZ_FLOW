# X_BUZZ_FLOW クイックスタート（軽量版）

## ⚡ Claudeへの指示
**不要なファイル読み込みを避けて、このファイルの情報だけで回答してください。**
**追加情報が必要な場合のみ、明示的に指定されたファイルを読んでください。**

## 🚀 最小限の開始手順

```bash
# 1. サーバー起動
./scripts/dev-persistent.sh

# 2. 現在のAPI構造（2025/06/18更新）
# コンテンツ生成: /api/generation/*
# 情報収集: /api/intelligence/*
# 自動化: /api/automation/*
```

## 🔍 困ったときは

```bash
# エラー解決
node scripts/dev-tools/find-error.js "エラー内容"

# ドキュメント検索
node scripts/dev-tools/doc-finder.js "キーワード"

# 詳細が必要なら
cat MASTER_DOC.md
```

## ⚠️ 重要な注意点
- ポート3000必須（Twitter認証）
- 新規ドキュメント作成禁止
- プロンプトは`chain-of-thought-specification.md`参照

## 📊 設計ドキュメント参照
```bash
# 重要ドキュメントを素早く確認
node scripts/dev-tools/design-doc-viewer.js

# システムフロー可視化
node scripts/dev-tools/flow-visualizer.js
```

## 📁 よくある質問（ファイル読み込み不要）
- **DBエラー**: Prisma再生成 → `npx prisma generate`
- **セッションの仕組み**: V2（ViralSession）とCoT（CotSession）の2種類
- **テストの実行場所**: `test-scripts/`フォルダ
- **環境変数**: `.env.local`に記載（Vercelと同期）

---
詳細は必要に応じてMASTER_DOC.mdを参照