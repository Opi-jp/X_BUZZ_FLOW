# BuzzFlow システムリファクタリング計画

## 🎯 目標
Perplexity統合を機に、システム全体を整理し、「朝5分で1日の準備が完了する」体験を実現する。

## 📱 ページ統合計画

### 1. メインダッシュボード統合
```
削除: /dashboard（旧ダッシュボード）
強化: /dashboard-v2 → /dashboard（新メインダッシュボード）

新ダッシュボードの機能:
- Perplexityリアルタイムトレンド
- 統合ブリーフィング（バズ×ニュース×トレンド）
- ワンクリックアクション
- 基本統計（旧dashboardから移植）
```

### 2. シンプル化されたナビゲーション
```
必須機能（毎日使う）:
├── 🚀 コマンドセンター（新dashboard）
├── ✍️ クイック投稿（/create の簡易版）
└── 📊 今日の成果（/analytics の簡易版）

詳細機能（たまに使う）:
├── 🔍 詳細収集設定（/collect）
├── 📰 ニュース管理（/news）
├── 🎨 パターン管理（/patterns）
└── ⚙️ 設定（/settings）
```

## 🗑️ 削除対象

### 1. 不要なAPI（即削除）
```
/api/test-* （11個すべて）
/api/check-dataset
/api/check-run*
/api/debug/twitter-token
/api/import-my-tweets-initial
```

### 2. 重複ページ
```
/dashboard（旧版）→ dashboard-v2に統合
/analytics/buzz → /analyticsに統合
```

## 🚀 新規実装（Perplexity活用）

### 1. 統合コマンドセンターAPI
```typescript
// /api/command-center/briefing
export async function POST() {
  // 1. バズツイート取得
  const buzzPosts = await getBuzzPosts(24h)
  
  // 2. ニュース取得
  const news = await getLatestNews()
  
  // 3. Perplexityに統合分析を依頼
  const analysis = await perplexity.analyze({
    buzzPosts,
    news,
    userContext: "50代クリエイティブディレクター"
  })
  
  // 4. アクションプラン生成
  return {
    trends: analysis.trends,
    rpTargets: analysis.rpCandidates,
    postIdeas: analysis.contentSuggestions,
    schedule: analysis.optimalTiming
  }
}
```

### 2. ワンクリック投稿生成
```typescript
// /api/quick-generate
export async function POST({ type, context }) {
  // Perplexityの分析結果を使って即座に投稿生成
  const content = await generateWithContext({
    type: "rp" | "original" | "news_comment",
    perplexityContext: context.trends,
    userStyle: "逆張り×経験値"
  })
  
  return { content, scheduledTime }
}
```

### 3. 自動監視システム
```typescript
// /api/cron/monitor
- 3時間ごとにトレンド監視
- 重要な変化をPush通知
- RPチャンスを自動検出
```

## 📊 UI/UXの改善

### 1. 新コマンドセンター（メインダッシュボード）
```
┌────────────────────────────────────────────────┐
│  BuzzFlow Command Center         [朝の5分準備] │
├────────────────────────────────────────────────┤
│                                                │
│  Perplexity分析: "今日はAI疲れに逆張りが効く" │
│                                                │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 🎯 今すぐRP  │  │ 💡 投稿案   │         │
│  │              │  │              │         │
│  │ @sama ●     │  │ 朝: 非効率論 │         │
│  │ @ylecun ●   │  │ 昼: 経験価値 │         │
│  │ @AndrewYNg ●│  │ 夜: 未来予測 │         │
│  └──────────────┘  └──────────────┘         │
│                                                │
│  [全て実行] [個別選択] [詳細を見る]           │
└────────────────────────────────────────────────┘
```

### 2. クイック投稿（簡易版）
```
┌────────────────────────────────────────────────┐
│  何について投稿する？                          │
│  ┌──────────────────────────────────────┐    │
│  │ Perplexity提案: AIの効率化疲れ       │    │
│  └──────────────────────────────────────┘    │
│                                                │
│  [逆張り視点で生成] [経験談で生成] [予測で生成]│
└────────────────────────────────────────────────┘
```

## 🔧 技術的改善

### 1. API統合
```typescript
// 統一されたAPIクライアント
class UnifiedAPIClient {
  async getCommandBriefing()
  async generateContent(type, context)
  async schedulePost(content, time)
  async analyzePerformance()
}
```

### 2. リアルタイム更新
```typescript
// WebSocket or SSE
- 新しいトレンドの通知
- RPチャンスのアラート
- 投稿結果の即座反映
```

### 3. エラー処理の統一
```typescript
// グローバルエラーハンドラー
- APIエラーの適切な表示
- 自動リトライ
- フォールバック処理
```

## 📅 実装スケジュール

### Day 1-2: 整理と統合
- [ ] 不要API削除
- [ ] dashboard統合
- [ ] ナビゲーション整理

### Day 3-4: Perplexity実装
- [ ] command-center API
- [ ] 統合分析機能
- [ ] リアルタイム更新

### Day 5: テストと最適化
- [ ] 統合テスト
- [ ] パフォーマンス測定
- [ ] UI微調整

## 🎯 期待される成果

### Before（現在）
- 朝の準備: 30-45分
- 手動操作: 20回以上
- 成功率: 不明

### After（改善後）
- 朝の準備: 5分
- クリック数: 3-5回
- 成功率: 測定可能

## 📝 削除チェックリスト

```bash
# 削除対象ファイル
rm -rf app/api/test-*
rm -rf app/api/check-*
rm -rf app/api/debug/twitter-token
rm -rf app/dashboard/page.tsx
rm -rf app/analytics/buzz

# 統合対象
mv app/dashboard-v2/* app/dashboard/
```

---

これにより、シンプルで強力な「AI駆動SNS運用システム」が完成します。