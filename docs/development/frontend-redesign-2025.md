# フロントエンド再設計ドキュメント（2025年6月）

## 現状分析

### 現在の実装状況
1. **メインページ構成**
   - `/viral` - ダッシュボード（モックデータ使用）
   - `/viral/cot` - CoTセッション作成
   - `/viral/cot/session/[sessionId]` - セッション詳細
   - `/viral/cot/drafts` - 下書き一覧
   - `/viral/cot/drafts/[draftId]` - 下書き編集

2. **問題点**
   - 統計データがモック
   - 古いページが残存（`/viral/gpt/*`など）
   - 非同期処理の状態管理が不完全
   - トリガーベースシステムとの不整合

## 再設計方針

### 1. Chain of Thought仕様書v2への準拠
- **4フェーズ構成**（Phase 2&3統合）を反映
- **トリガーベース**の非同期処理に対応
- **手動進行**の明確化（フェーズ間）

### 2. 画面構成の整理

#### A. ダッシュボード（`/viral`）
```typescript
interface DashboardData {
  // リアルタイムの統計
  activeSessions: {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
  }
  
  // 下書き・投稿状況
  content: {
    drafts: number
    scheduled: number
    published: number
    avgEngagement: number
  }
  
  // 最近の活動
  recentActivity: {
    sessions: CotSession[]
    drafts: CotDraft[]
    posts: ViralPost[]
  }
}
```

#### B. セッション管理（`/viral/cot`）

##### 作成画面
- シンプルな3項目入力
  - テーマ（theme）
  - スタイル（style）
  - プラットフォーム（platform）
- 「セッション開始」ボタン

##### セッション詳細（`/viral/cot/session/[sessionId]`）
```typescript
interface SessionDetailView {
  // セッション情報
  session: {
    id: string
    theme: string
    style: string
    platform: string
    status: SessionStatus
    currentPhase: number
    currentStep: PhaseStep
  }
  
  // フェーズ進行状況
  phases: {
    phase1: {
      think: StepResult      // 検索クエリ生成
      execute: StepResult    // Perplexity検索
      integrate: StepResult  // トレンド分析
    }
    phase2: {
      think: StepResult      // 機会評価＋コンセプト
    }
    phase3: {
      think: StepResult      // コンテンツ生成
    }
    phase4: {
      think: StepResult      // 実行戦略
    }
  }
  
  // アクション
  actions: {
    canProceed: boolean      // 次のステップへ進める
    canRetry: boolean        // リトライ可能
    nextAction: string       // 次のアクション説明
  }
}
```

##### UI要素
1. **進行状況ビジュアライゼーション**
   - 4フェーズのプログレスバー
   - 各フェーズ内のステップ表示
   - 現在の処理状況

2. **結果表示エリア**
   - 各フェーズの結果を展開可能
   - JSON/フォーマット済み切り替え
   - エラー詳細表示

3. **アクションボタン**
   - 「次のステップへ」（自動進行）
   - 「次のフェーズへ」（手動確認）
   - 「リトライ」（エラー時）
   - 「下書きを見る」（完了時）

#### C. 下書き管理（`/viral/cot/drafts`）

##### 一覧画面の改善
```typescript
interface DraftListView {
  // グループ化
  draftsBySession: Map<string, CotDraft[]>
  
  // フィルター
  filters: {
    status: DraftStatus[]
    dateRange: DateRange
    platform: Platform[]
  }
  
  // ソート
  sortBy: 'createdAt' | 'scheduledAt' | 'engagement'
}
```

##### 編集画面の強化
- リアルタイム文字数カウント
- プレビュー表示
- ハッシュタグ管理
- 投稿タイミング設定
- A/Bテストバリエーション

### 3. 非同期処理の可視化

#### ステータス表示
```typescript
enum ProcessingStatus {
  IDLE = 'idle',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

interface ProcessingIndicator {
  status: ProcessingStatus
  message: string
  progress?: number
  estimatedTime?: number
  error?: ErrorDetail
}
```

#### リアルタイム更新
- WebSocket or ポーリング
- 処理状況の自動更新
- エラー時の即時通知

### 4. 削除すべき古いページ
- `/viral/gpt/*` - 旧実装
- `/viral/enhanced` - 使用されていない
- `/viral-test` - テストページ
- 重複する結果ページ

### 5. 新規追加機能

#### A. 分析ダッシュボード
- 投稿パフォーマンスの可視化
- エンゲージメント推移
- 最適な投稿時間分析

#### B. テンプレート管理
- 成功したコンテンツのテンプレート化
- カスタムプロンプトの保存

#### C. バッチ処理
- 複数セッションの一括作成
- スケジュール実行

## 実装優先順位

### Phase 1（最優先）
1. ダッシュボードのリアルデータ化
2. セッション詳細画面の改善
3. 非同期処理の状態管理

### Phase 2
1. 下書き管理の強化
2. 分析機能の追加
3. エラーハンドリングの改善

### Phase 3
1. テンプレート機能
2. バッチ処理
3. 高度な分析機能

## 技術的考慮事項

### 状態管理
- Zustand or Context APIでグローバル状態管理
- セッション状態のリアルタイム同期
- オプティミスティックUI更新

### パフォーマンス
- React Suspenseでローディング状態
- 仮想スクロールで大量データ対応
- 画像の遅延読み込み

### アクセシビリティ
- キーボードナビゲーション
- スクリーンリーダー対応
- 高コントラストモード

## まとめ
現在のフロントエンドは基本機能は実装されているが、Chain of Thought v2仕様やトリガーベース非同期処理に完全に対応していない。この再設計により、より直感的で効率的なUIを実現し、システムの真の能力を引き出すことができる。