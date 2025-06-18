# 過去3ヶ月ツイートデータ分析計画

## 🎯 目的
- ユーザー（大屋友紀雄さん）の投稿パターン・成功要因を分析
- パーソナライズされたコンテンツ生成戦略の構築
- 効果的な投稿時間・頻度・スタイルの特定

## 📊 取得対象データ

### 基本投稿データ
- **投稿内容**: 全文テキスト
- **投稿時間**: 曜日・時間帯パターン分析用
- **エンゲージメント**: いいね・RT・返信数
- **インプレッション**: 到達数（可能な場合）
- **ハッシュタグ**: 使用パターン分析
- **メディア**: 画像・動画の有無

### 詳細分析項目
- **投稿タイプ**: オリジナル・RT・返信
- **投稿長**: 文字数とエンゲージメントの相関
- **トピック**: クリエイティブ・AI・働き方・映像制作など
- **感情トーン**: ポジティブ・ニュートラル・ネガティブ
- **成功投稿**: 高エンゲージメント投稿の特徴

## 🤖 AI分析の活用

### Gemini AI分析
```typescript
// 各投稿に対して実行
const analysis = await geminiAnalyzer.analyzeBuzzPost({
  content: tweet.text,
  likes: tweet.likes,
  retweets: tweet.retweets,
  replies: tweet.replies
})

// 分析結果を蓄積してパターン特定
- 成功するキーワード・フレーズ
- 効果的な投稿構造
- バイラル要因の特定
```

### パターン学習
- **成功フォーミュラ**: 高エンゲージメント投稿の共通点
- **最適タイミング**: 曜日・時間帯別パフォーマンス
- **効果的トピック**: 反応の良いテーマ・キーワード
- **文体特徴**: ユーザー独自の表現スタイル

## 📈 活用シナリオ

### 1. パーソナライズド生成
```typescript
// ユーザーの成功パターンを活用した生成
const personalizedContent = await generateContent({
  baseNews: selectedNews,
  userStyle: historicalAnalysis.successfulPatterns,
  preferredTopics: historicalAnalysis.topPerformingTopics,
  optimalTiming: historicalAnalysis.bestPostingTimes
})
```

### 2. A/Bテスト戦略
- **スタイルA**: ユーザーの過去成功パターン
- **スタイルB**: トレンド重視パターン
- **スタイルC**: ハイブリッド（ユーザー+トレンド）

### 3. 改善提案
- 使用頻度の低い効果的キーワードの提案
- 未開拓の成功しそうなトピック領域
- 投稿時間・頻度の最適化提案

## 🛠️ 実装計画

### Phase 1: データ取得（今後実装）
```typescript
// KaitoAPI または Twitter API v2 を使用
const historicalTweets = await fetchUserTweets({
  username: 'yukio_oya',
  startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3ヶ月前
  includeMetrics: true,
  maxResults: 1000
})
```

### Phase 2: データベース拡張
```sql
-- 履歴ツイート分析テーブル
CREATE TABLE user_tweet_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  tweet_id TEXT UNIQUE,
  content TEXT,
  posted_at TIMESTAMP,
  likes_count INT,
  retweets_count INT,
  replies_count INT,
  impressions_count INT,
  hashtags TEXT[],
  media_urls TEXT[],
  
  -- AI分析結果
  ai_analysis JSONB,
  success_score FLOAT,
  topic_category TEXT,
  emotional_tone TEXT,
  key_phrases TEXT[],
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- パフォーマンス分析ビュー
CREATE VIEW user_performance_patterns AS
SELECT 
  EXTRACT(dow FROM posted_at) as day_of_week,
  EXTRACT(hour FROM posted_at) as hour,
  topic_category,
  AVG(likes_count + retweets_count + replies_count) as avg_engagement,
  COUNT(*) as post_count
FROM user_tweet_history 
GROUP BY day_of_week, hour, topic_category;
```

### Phase 3: 分析エンジン
```typescript
// 履歴分析API
app.post('/api/user/analyze-history', async (req, res) => {
  const analysis = await analyzeUserHistory(userId)
  return {
    successPatterns: analysis.topPerformingPatterns,
    optimalTiming: analysis.bestPostingSchedule,
    topicEffectiveness: analysis.topicPerformance,
    styleCharacteristics: analysis.writingStyle,
    improvementSuggestions: analysis.recommendations
  }
})
```

### Phase 4: 生成システム統合
```typescript
// パーソナライズド生成
const personalizedDraft = await createPersonalizedContent({
  news: selectedNews,
  userHistory: userAnalysis,
  targetMetrics: { engagement: 'high', reach: 'wide' },
  style: 'user_optimized' // ユーザーの成功パターン
})
```

## 📊 期待される効果

### 精度向上
- **エンゲージメント予測**: ±20% → ±5%
- **バイラル可能性**: 汎用 → パーソナライズ
- **最適化提案**: 一般的 → 個人特化

### 戦略的インサイト
- **未開拓領域**: 成功しそうな新しいトピック
- **最適化ポイント**: 具体的な改善箇所
- **競合優位性**: 個人の強みを活かした差別化

### 運用効率化
- **自動最適化**: 過去データに基づく自動調整
- **予測投稿**: 成功確率の高いタイミング提案
- **継続学習**: 新しい投稿結果で分析精度向上

## 🚀 実装優先度

1. **高優先度**: データ取得・保存機能
2. **中優先度**: 基本分析エンジン
3. **低優先度**: 高度な予測・最適化機能

この履歴分析により、X_BUZZ_FLOWは「世界初の完全パーソナライズド・バイラルコンテンツ生成システム」として完成します。