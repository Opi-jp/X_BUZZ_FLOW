# X_BUZZ_FLOW - AIバイラルコンテンツシステム

## 🚨 重要：最初にこれを読め！

### 🛑 最軽量版（NEW）
```bash
# Claudeの自動読み込みを止める
cat START_HERE.md
```

### 🚀 軽量版
```bash
# 最小限の情報
cat QUICK_START.md
```

### 📚 詳細版（必要に応じて）
```bash
cat CLAUDE.md      # 詳細な手順
cat MASTER_DOC.md  # システムの現状
cat ERRORS.md      # エラー解決集
```

**軽量版で十分。詳細は必要になってから。**

## 🎯 クイックリファレンス

### 開発を始める
```bash
# 永続サーバーの起動（必須）
./scripts/dev-persistent.sh

# エラーが出たら
node scripts/dev-tools/find-error.js "エラー内容"

# プロンプトを編集する（NEW）
node scripts/dev-tools/prompt-editor.js list
node scripts/dev-tools/prompt-editor.js edit gpt/generate-concepts.txt

# ⚠️ 重要：プロンプトエディターの使い方
# 1. 変数プレビュー（メニュー4）で使用される変数を確認
# 2. JSON検証（メニュー5）で問題のある記述を確認
# 3. 問題がある場合は修正してから使用すること
```

### 使うAPI（2025年6月18日更新）
```
セッション: /api/generation/content/sessions/[id]
下書き:     /api/generation/drafts/[id]
ニュース:   /api/intelligence/news/*
バズ分析:   /api/intelligence/buzz/*
```

## 技術スタック

- **Frontend**: Next.js 15.3 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase) + ChromaDB
- **ORM**: Prisma
- **AI**: Claude API, Kaito API
- **Deployment**: Vercel

## 主要機能

1. バズ投稿収集（Kaito API）
2. AIによる投稿パターン分析
3. Claude APIによる投稿文案生成
4. 投稿スケジューリング
5. パフォーマンス分析
6. 知識グラフによる関係性分析

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集

# データベースセットアップ
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

## 環境変数

```
# Database
DATABASE_URL=
DIRECT_URL= # Prismaマイグレーション用

# AI APIs
CLAUDE_API_KEY=
KAITO_API_KEY=

# Authentication
NEXTAUTH_URL=
NEXTAUTH_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# News APIs
NEWSAPI_KEY=

# Cron Jobs
CRON_SECRET= # Vercel Cron Job認証用
```

## 定時実行設定

毎日朝6時（JST）にRSS収集を自動実行：

1. Vercel環境変数に`CRON_SECRET`を設定（ランダムな文字列）
2. デプロイ後、Vercelダッシュボードで確認