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
DATABASE_URL=
CLAUDE_API_KEY=
KAITO_API_KEY=
CHROMA_HOST=
CHROMA_PORT=
```