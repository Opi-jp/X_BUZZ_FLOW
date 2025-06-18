# X_BUZZ_FLOW データフロー完全解析

## 全体アーキテクチャ

X_BUZZ_FLOWには**2つの独立したシステム**が並行して動作している：

1. **V2システム** - シンプルなバイラルコンテンツ生成
2. **CoT (Chain of Thought)システム** - 高度な5段階思考プロセス

---

## 1. V2システムのデータフロー

### データフロー図
```mermaid
graph TD
    A[POST /api/viral/v2/sessions] --> B[セッション作成]
    B --> C[POST /api/viral/v2/sessions/{id}/collect-topics]
    C --> D[Perplexity API]
    D --> E[トピック抽出・保存]
    E --> F[POST /api/viral/v2/sessions/{id}/generate-concepts]
    F --> G[GPT-4o API]
    G --> H[10コンセプト生成]
    H --> I[POST /api/viral/v2/sessions/{id}/generate-contents]
    I --> J[GPT-4o API]
    J --> K[選択されたコンセプトでコンテンツ生成]
    K --> L[ViralDraftV2テーブルに下書き保存]
```

### 1.1 セッション作成
**API**: `POST /api/viral/v2/sessions`

**入力データ**:
```json
{
  "theme": "AIと働き方",
  "platform": "Twitter", 
  "style": "洞察的"
}
```

**データベース保存**:
```sql
INSERT INTO viral_sessions (theme, platform, style, status)
VALUES ('AIと働き方', 'Twitter', '洞察的', 'CREATED')
```

### 1.2 トピック収集
**API**: `POST /api/viral/v2/sessions/{id}/collect-topics`

**処理フロー**:
1. Perplexityプロンプト構築（415行のテンプレート）
2. Perplexity API呼び出し
3. JSON抽出（マークダウンコードブロック対応）
4. データベース更新

**Perplexityリクエスト**:
```json
{
  "model": "llama-3.1-sonar-large-128k-online",
  "messages": [
    {
      "role": "system",
      "content": "質問の意図を理解し、3つのトピックをJSON形式で提供してください。必ずURLと日付を含めてください。"
    },
    {
      "role": "user", 
      "content": "...長大なプロンプト..."
    }
  ],
  "max_tokens": 4000,
  "temperature": 0.7
}
```

**データベース保存構造**:
```json
{
  "raw": "Perplexityの生レスポンス",
  "parsed": [
    {
      "TOPIC": "トピックタイトル",
      "url": "記事URL",
      "date": "2024-06-17",
      "summary": "記事要約",
      "keyPoints": ["ポイント1", "ポイント2"],
      "perplexityAnalysis": "バイラル分析",
      "additionalSources": [{"url": "...", "title": "..."}]
    }
  ],
  "sources": ["検索結果"],
  "citations": ["引用情報"]
}
```

### 1.3 コンセプト生成
**API**: `POST /api/viral/v2/sessions/{id}/generate-concepts`

**処理フロー**:
1. 上位2つのトピックを選択
2. 各トピックで5つのコンセプト生成（合計10個）
3. フック、角度、投稿構造を含む詳細設計

**GPT-4oリクエスト**:
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "JSON形式で正確に出力してください。"
    },
    {
      "role": "user",
      "content": "...コンセプト生成プロンプト..."
    }
  ],
  "temperature": 0.8,
  "max_tokens": 2000
}
```

**生成データ構造**:
```json
[
  {
    "conceptId": "topic1_concept1",
    "format": "single|thread|carousel",
    "hookType": "意外性|緊急性|自己投影|数字・ロジック|問い・未完性",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "方向性",
      "background": "方向性", 
      "mainContent": "方向性",
      "reflection": "方向性",
      "cta": "方向性"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["ハッシュタグ"]
  }
]
```

### 1.4 コンテンツ生成
**API**: `POST /api/viral/v2/sessions/{id}/generate-contents`

**入力**: 選択されたコンセプトIDの配列
```json
{
  "selectedIds": ["topic1_concept2", "topic2_concept1"]
}
```

**処理フロー**:
1. 選択されたコンセプトでコンテンツ生成
2. 135-140文字最適化
3. スレッド形式の場合は5ツイートに分割
4. ViralDraftV2テーブルに下書き保存

**生成例**:
```json
{
  "content": "🌟AIが未来の働き方を革命！AIエージェントがどのように私たちの仕事を変えるか、知っていますか？",
  "hashtags": ["#AI", "#働き方革命"],
  "visualNote": "必要な画像や動画の説明"
}
```

### V2システムの特徴
- **同期処理**: 各ステップは即座に結果を返す
- **手動進行**: ユーザーが次のステップをトリガー
- **シンプル**: 3段階のワークフロー
- **実績**: 安定稼働中

---

## 2. CoT (Chain of Thought)システムのデータフロー

### データフロー図
```mermaid
graph TD
    A[POST /api/viral/cot-session/create] --> B[セッション作成]
    B --> C[POST /api/viral/cot-session/{id}/process-async]
    C --> D[非同期タスクキュー]
    
    D --> E[Phase 1: THINK]
    E --> F[GPT-4o: 検索クエリ生成]
    F --> G[Phase 1: EXECUTE] 
    G --> H[Perplexity: 複数検索実行]
    H --> I[Phase 1: INTEGRATE]
    I --> J[GPT-4o: 結果統合]
    
    J --> K[Phase 2: THINK]
    K --> L[GPT-4o: 機会評価]
    L --> M[Phase 2: INTEGRATE]
    M --> N[GPT-4o: コンセプト生成]
    
    N --> O[Phase 3-5: 同様のフロー]
    O --> P[下書き作成]
    P --> Q[完了]
```

### 2.1 セッション作成
**API**: `POST /api/viral/cot-session/create`

**入力データ**:
```json
{
  "theme": "AIと働き方",
  "style": "洞察的", 
  "platform": "Twitter"
}
```

**データベース保存**:
```sql
INSERT INTO cot_sessions (theme, style, platform, status, current_phase, current_step)
VALUES ('AIと働き方', '洞察的', 'Twitter', 'PENDING', 1, 'THINK')
```

### 2.2 非同期処理システム
**API**: `POST /api/viral/cot-session/{id}/process-async`

**処理の流れ**:

#### A. THINKステップ
1. GPT-4oで検索クエリ生成
2. 非同期タスクをキューに追加
3. ワーカーが処理完了後、continue-asyncを呼び出し

**タスクデータ構造**:
```json
{
  "type": "GPT_COMPLETION",
  "sessionId": "uuid",
  "phaseNumber": 1,
  "stepName": "THINK",
  "request": {
    "model": "gpt-4o",
    "messages": [...],
    "temperature": 0.7,
    "max_tokens": 4000,
    "response_format": {"type": "json_object"}
  }
}
```

#### B. EXECUTEステップ（Phase 1のみ）
1. THINKで生成された検索クエリを実行
2. 複数のPerplexity検索を並行実行
3. 全検索完了後、continue-asyncを呼び出し

**Perplexityバッチタスク**:
```json
[
  {
    "type": "PERPLEXITY_SEARCH",
    "sessionId": "uuid", 
    "phaseNumber": 1,
    "stepName": "EXECUTE",
    "request": {
      "query": "AIが働き方に与える具体的な影響...",
      "systemPrompt": "質問の意図を理解し、適切な情報を提供してください。必ずURLと日付を含めてください。"
    }
  }
]
```

#### C. INTEGRATEステップ
1. THINK + EXECUTEの結果を統合
2. 次のフェーズで使用する形式に整理
3. 完了後、次のフェーズのTHINKを自動開始

### 2.3 フェーズ別処理内容

#### Phase 1: トレンド収集
- **THINK**: 動的検索クエリ生成
- **EXECUTE**: Perplexity検索実行
- **INTEGRATE**: トレンド特定

#### Phase 2: 機会評価  
- **THINK**: Phase 1の結果を分析
- **EXECUTE**: スキップ
- **INTEGRATE**: 3つの機会選択

#### Phase 3: コンセプト生成
- **THINK**: 機会からコンセプト生成
- **EXECUTE**: スキップ  
- **INTEGRATE**: 3つのコンセプト詳細化

#### Phase 4: コンテンツ生成
- **THINK**: コンセプトからコンテンツ生成
- **EXECUTE**: スキップ
- **INTEGRATE**: 完全な投稿文作成

#### Phase 5: 実行戦略
- **THINK**: 戦略とKPI設定
- **EXECUTE**: スキップ
- **INTEGRATE**: 最終戦略策定

### 2.4 非同期処理の仕組み

#### api_tasksテーブル構造
```sql
CREATE TABLE api_tasks (
  id TEXT PRIMARY KEY,
  type TEXT, -- GPT_COMPLETION, PERPLEXITY_SEARCH
  session_id TEXT,
  phase_number INTEGER,
  step_name TEXT, -- THINK, EXECUTE, INTEGRATE
  request JSON,
  status TEXT, -- QUEUED, PROCESSING, COMPLETED, FAILED
  response JSON,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

#### 自動継続メカニズム
```javascript
// continue-async/route.ts
setTimeout(async () => {
  const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process-async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
}, 2000)
```

### 2.5 下書き作成
Phase 5完了後、自動的に3つの下書きを作成：

```javascript
// 各コンセプトで下書き作成
for (let i = 0; i < concepts.length; i++) {
  const concept = concepts[i]
  const content = contents[i] || {}
  
  await prisma.cotDraft.create({
    data: {
      sessionId,
      conceptNumber: i + 1,
      title: concept.title || content.title,
      hook: concept.hook || concept.B,
      angle: concept.angle || concept.C,
      format: concept.format || concept.A,
      content: content.mainPost || null,
      // その他のフィールド...
    }
  })
}
```

---

## 3. 共通部分と相違点

### 3.1 共通データ構造

#### 両システムで使用される形式
- **トピック**: `{TOPIC, url, date, summary, keyPoints, perplexityAnalysis}`
- **ハッシュタグ**: `string[]`
- **投稿タイミング**: `string`
- **ビジュアル案**: `string`

### 3.2 主要な相違点

| 項目 | V2システム | CoTシステム |
|------|------------|-------------|
| **処理方式** | 同期処理 | 非同期処理 |
| **進行方式** | 手動トリガー | 自動継続 |
| **段階数** | 3段階 | 5段階 |
| **Think深度** | 浅い | 深い |
| **データベース** | ViralSession | CotSession |
| **下書きテーブル** | ViralDraftV2 | CotDraft |
| **複雑度** | シンプル | 高度 |

### 3.3 データベーステーブルの使い分け

#### V2システム
- `viral_sessions` - セッション管理
- `viral_drafts_v2` - 下書き管理
- `viral_draft_performance` - パフォーマンス追跡

#### CoTシステム  
- `cot_sessions` - セッション管理
- `cot_phases` - フェーズ別詳細
- `cot_drafts` - 下書き管理
- `cot_draft_performance` - パフォーマンス追跡
- `api_tasks` - 非同期タスク管理

---

## 4. 実際の処理内容

### 4.1 Perplexityへのリクエスト

#### V2システム
```javascript
// 単一の大きなプロンプト（415行）
const prompt = `あなたは、新たなトレンドを特定し...
A：現在の出来事の分析
B：テクノロジーの発表とドラマ  
C：ソーシャルリスニング研究
D：バイラルパターン認識
...`

const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama-3.1-sonar-large-128k-online',
    messages: [
      { role: 'system', content: '質問の意図を理解し、3つのトピックをJSON形式で提供してください。' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.7
  })
})
```

#### CoTシステム
```javascript
// Phase 1 THINKで検索クエリを動的生成
const queries = [
  "AIが働き方に与える具体的な影響について、最新の企業導入事例と従業員の反応を含めて教えてください。",
  "AIによる職業自動化の現状と、新たに生まれる職種について詳しく解説してください。",
  "リモートワークとAIツールの組み合わせがもたらす働き方革命について分析してください。"
]

// 各クエリを個別にPerplexityに送信
for (const query of queries) {
  await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        { role: 'system', content: '質問の意図を理解し、適切な情報を提供してください。' },
        { role: 'user', content: query }
      ]
    })
  })
}
```

### 4.2 GPTへのリクエスト

#### V2システム
```javascript
// コンセプト生成
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'JSON形式で正確に出力してください。' },
    { role: 'user', content: `以下のトピックについて、5つのコンセプトを作成してください...` }
  ],
  temperature: 0.8,
  max_tokens: 2000
})
```

#### CoTシステム
```javascript
// Phase 1 THINK - 検索クエリ生成
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'バズるコンテンツ戦略家として...' },
    { role: 'user', content: `{theme}について検索クエリを生成してください` }
  ],
  temperature: 0.7,
  max_tokens: 4000,
  response_format: { type: 'json_object' }
})
```

---

## 5. エラーハンドリングと状態管理

### 5.1 V2システム
```javascript
// 同期エラー処理
try {
  const response = await openai.chat.completions.create(...)
  // 即座に結果を返す
  return NextResponse.json({ success: true, data: response })
} catch (error) {
  // セッションをリセット
  await prisma.viralSession.update({
    where: { id },
    data: { status: 'CREATED' }
  })
  return NextResponse.json({ error: 'Failed' }, { status: 500 })
}
```

### 5.2 CoTシステム
```javascript
// 非同期エラー処理
const task = await asyncProcessor.queueTask('GPT_COMPLETION', sessionId, phase, step, request)

// タスクは別プロセスで実行
// エラー時はリトライ機能付き
if (task.status === 'FAILED' && task.retryCount < 3) {
  await asyncProcessor.retryTask(task.id)
}
```

### 5.3 状態管理の比較

#### V2システム
```sql
-- シンプルな状態管理
UPDATE viral_sessions 
SET status = 'CONCEPTS_GENERATED' 
WHERE id = ?
```

#### CoTシステム  
```sql
-- 詳細な状態管理
UPDATE cot_sessions 
SET status = 'EXECUTING', 
    current_phase = 2,
    current_step = 'THINK',
    updated_at = NOW()
WHERE id = ?

-- フェーズ別状態も管理
UPDATE cot_phases
SET status = 'COMPLETED',
    integrate_result = ?,
    integrate_tokens = ?,
    integrate_at = NOW()
WHERE session_id = ? AND phase_number = ?
```

---

## 6. リトライ機能

### 6.1 V2システム
- **リトライなし**: エラー時は即座に失敗
- **手動復旧**: ユーザーが再実行

### 6.2 CoTシステム
- **自動リトライ**: 最大3回まで自動リトライ
- **指数バックオフ**: 失敗間隔を徐々に延長
- **部分復旧**: 特定のステップから再開可能

```javascript
// リトライロジック
const retryDelay = Math.pow(2, task.retryCount) * 1000 // 1s, 2s, 4s
setTimeout(() => {
  asyncProcessor.retryTask(task.id)
}, retryDelay)
```

---

## 7. 総合比較とデータフロー要約

### V2システム: シンプル・確実
```
CREATE → COLLECT → GENERATE → CONTENT → DONE
   ↓         ↓         ↓         ↓
セッション  トピック   コンセプト  下書き
作成       収集      生成       作成
```

### CoTシステム: 高度・自動化
```
CREATE → PHASE1 → PHASE2 → PHASE3 → PHASE4 → PHASE5 → DONE
         ↓        ↓        ↓        ↓        ↓
      検索計画   機会評価  コンセプト コンテンツ 実行戦略
      
各フェーズ: THINK → EXECUTE → INTEGRATE
```

### データの最終的な収束点
両システムとも最終的に以下の形式の下書きを生成：
- **タイトル**: `string`
- **コンテンツ**: `string` (135-140文字最適化)
- **ハッシュタグ**: `string[]`
- **ビジュアル案**: `string`
- **投稿タイミング**: `string`
- **パフォーマンス追跡**: 30分/1時間/24時間後の指標

この解析により、両システムの特徴と使い分けが明確になった。V2システムは迅速な結果が必要な場合、CoTシステムは高品質な戦略的コンテンツが必要な場合に適している。