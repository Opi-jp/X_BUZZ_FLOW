# プロンプト戦略見直しセッション（2025年6月17日）

## 概要
Chain of Thoughtの5フェーズ構成を3ステップ構成に簡略化し、UXを大幅に改善する実装計画。

## 🎯 主要な成果

### 1. 新しい3ステップ構成
旧: 5フェーズ（Phase 1-5）の複雑な構成
新: 3ステップのシンプルな構成

- **Step 1**: Perplexity直接検索（トピック収集）
- **Step 2**: コンセプト開発（2×3=6パターン）
- **Step 3**: コンテンツ生成（選択されたもののみ）

### 2. コンセプト選択UI
- 2つのトピックに対して3つの異なる視点でコンセプトを生成（計6つ）
- ユーザーがチェックボックスで選択
- 選択されたコンセプトのみコンテンツ生成（効率化）

## 📝 Perplexityプロンプト（ユーザー指定）

```
【AIと働き方】について【Twitter】において【エンターテイメント】で発信するためのバズるコンテンツを作成したいです。

以下の視点でトレンド情報を収集・分析し、直近でバズリそうなトピックを2つ特定してください。その際には判断の元となったニュースソースのURLを明記してください。ニュースソースは複数でも構いません。なお、ニュースソースは48時間以内のものを使用してください。

A：現在の出来事の分析
- AIと働き方に関する最新ニュース（特に感情的な反応を引き起こしているもの）
- この分野での有名人の発言や事件と、それに対する世間の強い反応
- AIと労働に関する政治的議論で意見が分かれているもの

B：テクノロジーの発表とテクノロジードラマ
- AI導入を巡る企業の対立や論争
- AIによる働き方の変化に関する文化的な衝突や社会運動
- 予想外の展開や驚きを生んだ事例
- インターネット上で話題になっているドラマチックな出来事

C：ソーシャルリスニング研究
- Twitterで急速に広がっているAIと働き方のトレンドやハッシュタグ
- TikTokで話題のAI関連のサウンドやチャレンジ
- Redditで感情的な議論が起きている投稿
- 急上昇しているGoogleトレンド
- バズっているYouTube動画
- ニュース記事のコメント欄で熱い議論になっているトピック

D：バイラルパターン認識
特に以下の要素を含むトピックを重点的に探してください：
- 強い意見の対立がある（賛成派vs反対派）
- 感情を強く刺激する（怒り、喜び、驚き、憤慨）
- 多くの人が共感できる体験談
- 思わずシェアしたくなる驚きの事実
- 今すぐ知らないと損するタイムリーな話題
- Twitter文化に合った面白さやミーム性

なお、出力は下記のJSON形式で出力してください。

{
  "TOPIC": "トピックのタイトル",
  "perplexityAnalysis": "なぜこれがバズる可能性があるのか、感情的な要素や対立構造を含めて分析（200文字）",
  "url": "記事のURL",
  "date": "公開日",
  "summary": "記事要約（200文字）"
}
```

## 🏗 新しい実装アーキテクチャ

### データベース構造（シンプル化）
```typescript
model ViralSession {
  id            String   @id @default(cuid())
  theme         String   
  platform      String   
  style         String   
  status        String   @default("CREATED")
  createdAt     DateTime @default(now())
  
  // Step 1の結果
  topics        Json?    // Perplexityの生データを保存
  
  // Step 2の結果
  concepts      Json?    // 9つのコンセプト
  selectedIds   String[] // 選択されたコンセプトID
  
  // Step 3の結果
  contents      Json?    // 生成されたコンテンツ
}

model ViralDraftV2 {
  id              String   @id @default(cuid())
  sessionId       String
  session         ViralSession @relation(fields: [sessionId])
  
  // コンテンツ情報
  conceptId       String   
  title           String
  content         String   @db.Text
  hashtags        String[]
  visualNote      String?
  
  // 投稿情報
  status          String   @default("DRAFT")
  scheduledAt     DateTime?
  postedAt        DateTime?
  
  // パフォーマンス
  performance     ViralPostPerformance?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 画面フロー
1. `/viral/create` - テーマ、プラットフォーム、スタイル選択
2. `/viral/session/[id]/topics` - 3つのトピック表示（元記事リンク付き）
3. `/viral/session/[id]/concepts` - 9つのコンセプトから選択（チェックボックス）
4. `/viral/session/[id]/results` - 生成されたコンテンツと投稿オプション
5. `/viral/drafts` - 下書き管理
6. `/viral/scheduler` - スケジュール投稿管理

### APIエンドポイント
```typescript
// コアフロー
POST /api/viral/v2/sessions
POST /api/viral/v2/sessions/[id]/collect-topics
POST /api/viral/v2/sessions/[id]/generate-concepts
POST /api/viral/v2/sessions/[id]/generate-contents

// 下書き・投稿
POST /api/viral/v2/drafts
PUT /api/viral/v2/drafts/[id]
POST /api/viral/v2/drafts/[id]/post-now
POST /api/viral/v2/drafts/[id]/schedule

// Cron
POST /api/cron/post-scheduled-v2
```

## 📊 テスト結果

### Perplexity直接テスト
- 48時間以内の記事3つを正常に取得
- 感情的要素と対立構造を含む分析を生成
- 元記事URLを正しく返却

### Phase 2 GPTテスト（コンセプト生成）
- 3つのトピックから3つのコンセプトを生成
- A（形式）、B（フック）、C（角度）、D（キーポイント5つ）を正しく出力

### Phase 3 GPTテスト（コンテンツ生成）
- エンターテイメントスタイルのコンテンツを生成
- 絵文字、ハッシュタグ、CTAを含む

## 🚨 重要な改善点

### スレッド形式の実装
現在の問題：スレッド形式でも単一投稿のような出力

改善案：
```json
{
  "format": "thread",
  "mainPost": [
    {
      "number": "1/5",
      "content": "ツイート本文（140文字以内）",
      "charCount": 95
    },
    // 2-5のツイート
  ],
  "totalCharCount": 436,
  "hashtags": ["#AI", "#自動運転"]
}
```

### UX改善ポイント
1. **明確な進行状況表示**
2. **Perplexity結果の即時表示**（元記事リンク付き）
3. **エラーハンドリングの強化**
4. **中間結果の確認可能**

## ⚡ 技術的決定事項

### ワーカー管理は不要
- Vercel Pro使用により同期処理で十分
- 処理時間：約65秒（制限内）
- システムの複雑性を大幅削減

### 処理時間の見積もり
- Step 1: 30秒（Perplexity 1回）
- Step 2: 20秒（GPT 1回）
- Step 3: 15秒（GPT 1回、選択分のみ）

## 📋 実装フェーズ

### フェーズ1: コア機能（3-4時間）
1. データベース作成
2. 基本API実装
3. 基本画面フロー

### フェーズ2: 下書き機能（2-3時間）
1. 下書き保存API
2. 下書き一覧・編集画面
3. 文字数カウント等のUX

### フェーズ3: 投稿機能（2-3時間）
1. Twitter投稿API統合
2. スケジューラー実装
3. Vercel Cron設定

### フェーズ4: 仕上げ（2時間）
1. パフォーマンストラッキング
2. エラーハンドリング
3. UI/UXの最終調整

## 💡 ユーザーからの重要な指摘
- 「前回の実装のときに、フロントエンドの遷移系がダメダメだった」
- 「Perplexityが集めてきた結果は一度ユーザーとして見たい」
- 「元記事へのリンクなどもほしい」
- 「コンセプトとコンテンツを混同しないように」
- 「スレッド方式のときの文字量や表示は改善が必要」

## 🔄 移行計画
- 旧実装（`/viral/gpt`）は残して並行運用
- 新実装（`/viral/v2`）を追加
- テストファイルを参考に実装
  - `/test-perplexity-direct.js`
  - `/test-phase2-gpt.js`
  - `/test-phase3-gpt.js`

## 🚀 次セッションでの作業開始方法

次のClaudeセッションでは、以下のコマンドを実行してください：

```bash
# 1. このドキュメントを読む
cat docs/prompt-strategy-review-2025-06-17.md

# 2. テストファイルの確認
ls test*.js
cat test-perplexity-direct.js
cat test-phase2-gpt.js
cat test-phase3-gpt.js

# 3. 実装開始
# フェーズ1から順番に実装を進める
```

### 実装チェックリスト
- [ ] データベーススキーマの作成（ViralSession, ViralDraftV2）
- [ ] Step 1: Perplexity検索API（`/api/viral/v2/sessions/[id]/collect-topics`）
- [ ] Step 2: コンセプト生成API（`/api/viral/v2/sessions/[id]/generate-concepts`）
- [ ] Step 3: コンテンツ生成API（`/api/viral/v2/sessions/[id]/generate-contents`）
- [ ] フロントエンド画面実装（topics, concepts, results）
- [ ] 下書き管理機能
- [ ] 投稿・スケジュール機能
- [ ] スレッド形式の改善実装

### 重要：プロンプトは必ずこのドキュメント内のものを使用すること