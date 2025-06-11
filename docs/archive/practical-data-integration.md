# 実践的なデータ統合アプローチ

## 🎯 核心的な問題
「多様なデータソースをどう**実用的に**統合するか」

## 💡 シンプルな解決策：用途別アプローチ

### 1. データを統合する目的を明確化

```typescript
// なぜデータを統合したいのか？
1. トレンド発見 → 「今何が話題か」を知りたい
2. 投稿案生成 → 「何を投稿すべきか」を決めたい  
3. 効果予測 → 「どれがバズるか」を予測したい
4. 関連性分析 → 「話題の流れ」を理解したい
```

### 2. 用途別の実装アプローチ

#### 🔥 用途1: 朝のトレンドブリーフィング

```typescript
// app/api/briefing/morning/route.ts
export async function generateMorningBrief() {
  // 1. 各ソースから昨日のデータを取得
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  // Twitter: バズったツイート
  const buzzTweets = await prisma.buzzPost.findMany({
    where: {
      postedAt: { gte: yesterday },
      likesCount: { gte: 1000 }
    },
    orderBy: { likesCount: 'desc' },
    take: 10
  })
  
  // News: 重要なニュース
  const importantNews = await prisma.newsArticle.findMany({
    where: {
      publishedAt: { gte: yesterday },
      importance: { gte: 0.7 }
    },
    orderBy: { importance: 'desc' },
    take: 10
  })
  
  // Perplexity: 今日のトレンド予測（リアルタイム取得）
  const trends = await perplexity.search({
    query: "AI ホワイトカラー 働き方 今日話題になりそうなトピック",
    recency: 'day'
  })
  
  // 2. 統合して分析（メモリ上で処理）
  const brief = {
    twitterTrends: extractTopics(buzzTweets),
    newsHighlights: summarizeNews(importantNews),
    predictions: trends.topics,
    
    // クロスソース分析
    convergingTopics: findCommonTopics([
      buzzTweets, 
      importantNews, 
      trends
    ]),
    
    // 投稿提案
    suggestions: generateSuggestions({
      trends: trends.topics,
      yourExpertise: 'ホワイトカラー代替',
      avoidTopics: getOverusedTopics(buzzTweets)
    })
  }
  
  return brief
}
```

#### 💬 用途2: スマートRP候補の発見

```typescript
// app/api/rp/smart-suggestions/route.ts
export async function findRPCandidates() {
  // 1. 直近6時間のバズツイート
  const recentBuzz = await prisma.buzzPost.findMany({
    where: {
      postedAt: { gte: sixHoursAgo },
      likesCount: { gte: 5000 },
      theme: { in: ['AI', 'テクノロジー', '働き方'] }
    },
    orderBy: { likesCount: 'desc' },
    take: 20
  })
  
  // 2. 各ツイートに対してPerplexityで深堀り
  const enrichedTweets = await Promise.all(
    recentBuzz.map(async (tweet) => {
      // このトピックの背景を調査
      const context = await perplexity.search({
        query: `${tweet.content} について詳しく教えて`,
        sources: ['news', 'academic']
      })
      
      return {
        ...tweet,
        context: context.answer,
        rpSuggestion: generateRPIdea({
          originalTweet: tweet,
          context: context,
          yourAngle: '50代クリエイティブ視点'
        })
      }
    })
  )
  
  // 3. 最適なRP候補を選定
  return enrichedTweets
    .filter(t => t.rpSuggestion.relevanceScore > 0.8)
    .slice(0, 5)
}
```

#### 📊 用途3: 週次パフォーマンス分析

```typescript
// app/api/analysis/weekly-performance/route.ts
export async function analyzeWeeklyPerformance() {
  // 1. 自分の投稿データ
  const myTweets = await prisma.buzzPost.findMany({
    where: {
      authorUsername: 'opi_jp',
      postedAt: { gte: oneWeekAgo }
    }
  })
  
  // 2. 同時期のトレンドと比較
  const weeklyTrends = await prisma.newsArticle.groupBy({
    by: ['category'],
    _count: true,
    where: {
      publishedAt: { gte: oneWeekAgo }
    }
  })
  
  // 3. NotebookLMで深い分析
  const analysis = await notebookLM.analyze({
    myTweets,
    marketTrends: weeklyTrends,
    question: "どのトピックでエンゲージメントが高かったか？なぜか？"
  })
  
  return {
    performance: calculateMetrics(myTweets),
    trendAlignment: compareTrendsAlignment(myTweets, weeklyTrends),
    insights: analysis.insights,
    recommendations: analysis.recommendations
  }
}
```

### 3. データ保存の実践的アプローチ

#### 軽量キャッシュテーブル

```prisma
// Perplexityなどのリアルタイムデータ用
model TrendCache {
  id         String   @id @default(uuid())
  source     String   // perplexity, gemini, etc
  query      String
  result     Json
  createdAt  DateTime @default(now())
  expiresAt  DateTime // 24時間後など
  
  @@index([source, query])
  @@map("trend_cache")
}
```

#### 分析結果の保存

```prisma
model AnalysisResult {
  id         String   @id @default(uuid())
  type       String   // daily_brief, weekly_report, etc
  data       Json     // 分析結果
  metadata   Json     // 使用したデータソース等
  createdAt  DateTime @default(now())
  
  @@index([type, createdAt])
  @@map("analysis_results")
}
```

### 4. 実装の優先順位（改訂版）

#### 🥇 今すぐ実装（1-2日）

1. **朝のトレンドブリーフィング**
   - 既存のDBを使って実装可能
   - Perplexity APIを追加するだけ
   - すぐに価値を実感できる

2. **スマートRP候補API**
   - バズツイート＋Perplexity文脈
   - 実装シンプル、効果大

#### 🥈 次に実装（3-5日）

3. **統合ダッシュボード**
   - 各データソースを横断表示
   - リアルタイムトレンド表示
   - 投稿提案の一覧

4. **週次分析レポート**
   - NotebookLM統合
   - パフォーマンス可視化

### 5. 重要な設計原則

#### ❌ やらないこと
- 巨大な統一スキーマを作る
- すべてをDBに保存しようとする
- 完璧なデータモデルを追求する

#### ✅ やること
- 用途に応じた最小限の統合
- リアルタイムデータは都度取得
- 既存のDBを最大限活用
- 必要に応じてキャッシュ

### 6. 具体的な実装手順

```bash
# Step 1: Perplexity統合（3時間）
touch app/lib/perplexity-client.ts
touch app/api/briefing/morning/route.ts

# Step 2: 統合ビューヘルパー（2時間）
touch app/lib/data-integration.ts
touch app/components/unified-dashboard.tsx

# Step 3: キャッシュ実装（1時間）
npx prisma migrate dev --name add_trend_cache
```

## 🎯 結論

データ統合は「完璧な統一モデル」より「実用的な用途別アプローチ」が効果的。

**今すぐやるべきこと**：
1. Perplexity APIの設定
2. 朝のブリーフィング機能の実装
3. 既存データとの簡単な組み合わせ

これで十分に価値のある統合分析が可能です！