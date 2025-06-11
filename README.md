# BuzzFlow - SNS投稿支援システム

X（旧Twitter）のバズ投稿を収集・分析し、AIを活用した投稿戦略を支援するシステム

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