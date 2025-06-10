# AI News Tree System - 設計案

## 概要
毎日AIに関する10〜20のニュースをTwitterにツリー形式で自動投稿するシステム

## 投稿フォーマット例
```
🤖 本日のAIニュース TOP10 (2025/06/11)

今日も注目のAI関連ニュースをお届けします！
各トピックの詳細は、このツリーで解説していきます🧵

1️⃣ OpenAI、新モデル発表
2️⃣ Google、AI検索を強化
3️⃣ 日本企業のAI活用事例
...
```

## システム構成

### 1. ニュース収集機能
- **データソース**
  - NewsAPI / Google News API
  - RSS フィード（TechCrunch, VentureBeat等）
  - Kaito APIでTwitterトレンド収集
  - Webスクレイピング（主要AI系サイト）

### 2. ニュース選定・ランキング
- **Claude APIで実装**
  - 重要度スコアリング
  - カテゴリ分類（研究、ビジネス、倫理、技術等）
  - 日本語要約生成
  - ツイート用の短文生成

### 3. ツリー構造生成
```typescript
interface NewsThread {
  id: string
  date: string
  mainTweet: {
    content: string  // TOP10リスト
    tweetId?: string
  }
  newsItems: NewsItem[]
}

interface NewsItem {
  rank: number
  title: string
  summary: string
  category: string
  source: string
  url: string
  tweet: {
    content: string  // 280文字以内
    parentId?: string  // リプライ先
    tweetId?: string
  }
}
```

### 4. 投稿スケジューリング
- 毎日定時（例：朝9時、夕方18時）
- ツリー形式で連続投稿
- 投稿間隔の調整（API制限対応）

## 実装プラン

### Phase 1: ニュース収集基盤
1. NewsAPIの統合
2. RSSフィード読み込み
3. ニュースDBテーブル追加

### Phase 2: AI処理
1. Claude APIでニュース分析
2. ランキング生成
3. ツイート文生成

### Phase 3: 自動投稿
1. ツリー投稿機能
2. スケジューラー設定
3. エラーハンドリング

## 必要な追加機能

### 1. データベース拡張
```prisma
model NewsSource {
  id        String   @id @default(uuid())
  name      String
  url       String
  type      String   // RSS, API, SCRAPING
  category  String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model NewsArticle {
  id          String   @id @default(uuid())
  sourceId    String
  title       String
  summary     String   @db.Text
  content     String   @db.Text
  url         String
  publishedAt DateTime
  category    String
  importance  Float    // AIによる重要度スコア
  processed   Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  source      NewsSource @relation(fields: [sourceId], references: [id])
  newsThread  NewsThreadItem[]
}

model NewsThread {
  id           String   @id @default(uuid())
  date         DateTime
  mainTweetId  String?  // 投稿後のツイートID
  status       String   // DRAFT, SCHEDULED, POSTING, POSTED
  totalItems   Int
  createdAt    DateTime @default(now())
  
  items        NewsThreadItem[]
}

model NewsThreadItem {
  id           String   @id @default(uuid())
  threadId     String
  articleId    String
  rank         Int
  tweetContent String
  tweetId      String?  // 投稿後のツイートID
  parentTweetId String? // リプライ先のツイートID
  postedAt     DateTime?
  
  thread       NewsThread @relation(fields: [threadId], references: [id])
  article      NewsArticle @relation(fields: [articleId], references: [id])
}
```

### 2. API Routes
- `/api/news/collect` - ニュース収集
- `/api/news/analyze` - AI分析・ランキング
- `/api/news/generate-thread` - ツリー生成
- `/api/news/post-thread` - ツリー投稿

### 3. UI画面
- ニュースソース管理
- 収集したニュース一覧
- ツリープレビュー・編集
- 投稿スケジュール管理

## 利点
1. **価値提供**: フォロワーに毎日厳選されたAI情報を提供
2. **エンゲージメント向上**: ツリー形式で詳細情報も提供
3. **自動化**: 一度設定すれば自動で継続
4. **カスタマイズ**: ニュースソースや選定基準を調整可能