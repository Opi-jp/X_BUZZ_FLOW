# Chain of Thought バイラルコンテンツ生成システム 実装ドキュメント

## システム概要

GPT-4oを使用した5段階のChain of Thought (CoT)プロセスで、高品質なバイラルコンテンツを自動生成するシステム。

## アーキテクチャ

```
[初期設定] → [Step1: Web検索] → [Step2: 分析] → [Step3: コンセプト] → [Step4: 生成] → [Step5: 戦略]
     ↓            ↓                ↓              ↓                ↓              ↓
  config      実データ収集      トレンド評価    アイデア作成      完全文章      実行計画
```

## 実装状況（2025年6月12日現在）

### ✅ 実装済み
- Step 1: Web検索機能付きデータ収集 (`/api/viral/gpt-session/[sessionId]/step1-responses`)
- Step 2-5: 基本的なエンドポイント
- セッション管理（GptAnalysisテーブル）
- 下書き管理（ContentDraftテーブル）

### 🚧 実装中
- 自動実行フロー (`/api/viral/gpt-session/auto-complete`)
- エラーハンドリングとリトライ
- デプロイ環境でのWeb検索機能

### ⏳ 未実装
- 自動投稿機能
- A/Bテスト機能
- パフォーマンストラッキング

## データベース構造

```sql
-- セッション管理
GptAnalysis {
  id: String @id
  sessionType: String
  metadata: Json  // config, currentStep, etc.
  response: Json  // step1-5の結果を保存
  tokens: Int
  duration: Int
  createdAt: DateTime
  updatedAt: DateTime
}

-- コンテンツ下書き
ContentDraft {
  id: String @id
  sessionId: String
  conceptNumber: Int
  topic: String
  platform: String
  content: String
  hashtags: String[]
  metadata: Json
  createdAt: DateTime
  updatedAt: DateTime
}
```

## API エンドポイント構成

```
/api/viral/gpt-session/
├── create/              # セッション作成
├── [sessionId]/
│   ├── step1-responses/ # Web検索付きデータ収集
│   ├── step2/          # トレンド評価
│   ├── step3/          # コンセプト作成
│   ├── step4/          # コンテンツ生成
│   └── step5/          # 実行戦略
├── auto-complete/      # 5段階自動実行
└── list/              # セッション一覧
```

## Chain of Thoughtの実装詳細

### 1. 初期設定の収集

```typescript
// ユーザー設定
{
  expertise: "クリエイティブディレクター",  // 専門分野
  platform: "Twitter",                      // プラットフォーム
  style: "教育的",                         // スタイル
  model: "gpt-4o"                          // 使用モデル
}
```

### 2. Step 1: Web検索でのデータ収集

**プロンプトの要点**:
- 専門分野視点での解釈を強調
- 8つのカテゴリから最新ニュース収集
- 実際のURLを含む記事情報取得

**出力形式**:
```json
{
  "articleAnalysis": [
    {
      "title": "実際の記事タイトル",
      "url": "https://...",
      "expertPerspective": "専門家としての独自解釈",
      "viralPotential": "バズる可能性とその理由"
    }
  ],
  "opportunityCount": 5,
  "keyPoints": ["重要ポイント1", "..."]
}
```

### 3. Step 2: トレンド評価（CoT活用）

**Chain of Thoughtの適用**:
- Step 1の記事分析結果を入力として使用
- 6軸評価でスコアリング
- 専門分野視点でのアングル特定

### 4. Step 3: コンセプト作成（CoT継続）

**前ステップの活用**:
- Step 2の高スコア機会を基に
- プラットフォーム特性を考慮
- 3つの異なるアプローチを生成

### 5. Step 4: 完全コンテンツ生成

**特徴**:
- コピペ可能な完成形
- ハッシュタグ・絵文字含む
- 投稿タイミング指示

### 6. Step 5: 実行戦略

**包括的な計画**:
- 即時アクション（2-4時間）
- 投稿期間（4-24時間）
- フォローアップ（24-48時間）

## 自動実行フローの実装

```typescript
// auto-complete エンドポイントの基本フロー
async function autoComplete(sessionId: string) {
  const results = {}
  
  // Step 1: Web検索
  results.step1 = await executeStep1(sessionId)
  
  // Step 2: Step1の結果を使って分析
  results.step2 = await executeStep2(sessionId, {
    previousStep: results.step1.response
  })
  
  // Step 3-5: 連鎖的に実行
  // ...
  
  // 下書き自動作成
  await createDrafts(results.step4.concepts)
  
  return results
}
```

## エラーハンドリング戦略

1. **API呼び出しエラー**
   - リトライロジック（最大3回）
   - エクスポネンシャルバックオフ

2. **パースエラー**
   - JSON抽出ロジック
   - フォールバック処理

3. **タイムアウト**
   - 各ステップ30秒制限
   - 部分的な結果保存

## デプロイ時の注意事項

### 環境変数チェックリスト
- [ ] `OPENAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `NEXTAUTH_URL`
- [ ] `DATABASE_URL`

### Vercel特有の設定
- Function timeout: 60秒以上推奨
- 環境変数の再デプロイ確認

## トラブルシューティング

### Web検索が動かない場合

1. **モデル確認**
```typescript
const supportsWebSearch = selectedModel === 'gpt-4o'
```

2. **ログ確認**
```typescript
console.log('Model:', selectedModel)
console.log('Response:', response)
```

3. **環境差分**
- ローカル: 直接API呼び出し
- Vercel: サーバーレス関数経由

## 今後の改善案

1. **並列処理**
   - Step 1のカテゴリ別検索を並列化
   - 複数コンセプトの同時生成

2. **キャッシュ戦略**
   - 類似クエリの結果再利用
   - トレンドデータの一時保存

3. **品質向上**
   - プロンプトの継続的改善
   - 成功パターンの学習

## 実装再開チェックリスト

VS CODEが落ちた後の作業再開時：

1. [ ] 環境変数の確認 (`env.local`)
2. [ ] npm install 実行
3. [ ] データベース接続確認
4. [ ] 最新コミットの確認
5. [ ] このドキュメントで現状把握
6. [ ] `/app/api/viral/gpt-session/[sessionId]/step1-responses/route.ts` から確認

---

最終更新: 2025年6月12日
現在の課題: デプロイ環境でのWeb検索機能の動作確認