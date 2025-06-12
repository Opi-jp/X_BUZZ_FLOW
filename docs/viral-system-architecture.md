# バイラルコンテンツ自動生成システム アーキテクチャ

## 概要
ChatGPTの分析力とClaudeの文案作成力を組み合わせた自動投稿システム

## システム構成

### 1. トレンド分析フェーズ（ChatGPT）

#### `/api/viral/analyze-trends`
- **目的**: 48時間以内のバズ機会を特定
- **実行頻度**: 30分ごと
- **入力**:
  - 最新ニュース（RSS/NewsAPI）
  - バズツイート（過去3時間）
  - 設定（専門分野、プラットフォーム、スタイル）
- **出力**:
  - バイラル機会リスト（3-5件）
  - 各機会のバズスコア
  - 推奨アングル

#### `/api/viral/evaluate-potential`
- **目的**: 各トレンドのバイラル性を評価
- **入力**: トレンド情報
- **出力**:
  - ウイルス速度指標
  - コンテンツアングル
  - 優先順位

### 2. コンテンツ生成フェーズ（Claude）

#### `/api/viral/generate-concepts`
- **目的**: バズるコンテンツコンセプトを作成
- **入力**:
  - ChatGPTの分析結果
  - ユーザーペルソナ（50代クリエイティブディレクター）
- **出力**:
  - 3つのコンセプト
  - 各コンセプトの詳細

#### `/api/viral/generate-posts`
- **目的**: 完全な投稿文を生成
- **入力**: 選択されたコンセプト
- **出力**:
  - 投稿文（140字 or スレッド）
  - ビジュアルガイド
  - 投稿タイミング

### 3. 実行・最適化フェーズ

#### `/api/viral/schedule`
- **目的**: 最適な時間に投稿をスケジュール
- **機能**:
  - 時間帯別エンゲージメント予測
  - 競合投稿の回避
  - A/Bテスト設定

#### `/api/viral/post`
- **目的**: Twitter APIで実際に投稿
- **機能**:
  - 自動投稿
  - スレッド対応
  - 画像アップロード

#### `/api/viral/track-performance`
- **目的**: パフォーマンスを追跡
- **追跡タイミング**:
  - 30分後（初動）
  - 1時間後
  - 24時間後
- **メトリクス**:
  - インプレッション、いいね、RT、コメント
  - エンゲージメント率
  - フォロワー増加数

### 4. 統合ワークフロー

#### `/api/viral/workflow/auto-generate`
```typescript
async function viralWorkflow() {
  // 1. トレンド分析（ChatGPT）
  const opportunities = await analyzeTrends({
    expertise: "AI × 働き方、25年のクリエイティブ経験",
    platform: "Twitter",
    style: "解説 × エンタメ"
  })
  
  // 2. 高ポテンシャル案件を選択
  const topOpportunities = opportunities
    .filter(o => o.viralScore > 0.8)
    .slice(0, 3)
  
  // 3. コンテンツ生成（Claude）
  const concepts = await generateConcepts(topOpportunities)
  const posts = await generatePosts(concepts)
  
  // 4. スケジュール登録
  await schedulePosts(posts)
  
  // 5. パフォーマンス追跡を予約
  schedulePerformanceTracking(posts)
}
```

## プロンプトテンプレート

### ChatGPT分析プロンプト
```
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

専門分野: ${expertise}
プラットフォーム: ${platform}
スタイル: ${style}

現在のデータ:
- 最新ニュース: ${newsData}
- トレンドトピック: ${trends}
- バズ投稿: ${buzzPosts}

[フェーズ1-2を実行...]
```

### Claude生成プロンプト
```
あなたは50代のクリエイティブディレクターです。
23年の映像制作経験と、AIトレンドへの深い洞察を持っています。

以下のバズ機会に対して、独自視点でコンテンツを作成してください：
${opportunities}

特に以下の視点を含めてください：
- 効率化への逆張り視点
- 経験者ならではの深い洞察
- エモーショナルな共感要素
```

## 実装優先順位

1. **Phase 1（1週間）**
   - ChatGPT API連携（トレンド分析）
   - Claude API連携（コンテンツ生成）
   - 基本的なデータモデル

2. **Phase 2（1週間）**
   - 自動スケジューリング
   - Twitter API投稿
   - 基本的なパフォーマンス追跡

3. **Phase 3（1週間）**
   - 詳細なパフォーマンス分析
   - A/Bテスト機能
   - 学習・最適化機能

## 成功指標（KPI）

- **エンゲージメント率**: 5%以上
- **バイラル係数**: 1.5以上（1投稿が1.5人に共有）
- **フォロワー増加**: 1投稿あたり20人以上
- **投稿効率**: 1日15分以内の運用時間