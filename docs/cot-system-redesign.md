# Chain of Thought システム再設計案

## 現状の良い点（流用する部分）

### 1. DBスキーマ設計
- **CotSession**: セッション管理が適切
- **CotPhase**: Think/Execute/Integrate の3段階を個別保存
- **CotDraft**: 3つのコンセプトと投稿管理
- **CotDraftPerformance**: パフォーマンス追跡

### 2. 実装済みの機能
- 各フェーズのプロンプト（仕様書準拠）
- Perplexity統合（自然言語クエリ）
- DB保存の仕組み
- エラーリトライ機能

## 改善が必要な点

### 1. デバッグ効率の向上
- **問題**: カンマひとつ直すのに5分かかる
- **解決策**: 
  - 永続サーバーでの開発（`npm run dev`を維持）
  - DB保存済みデータからの部分実行
  - 個別フェーズのテストツール

### 2. UI/UXの刷新
- **問題**: 古い画面設計
- **解決策**:
  - セッション管理画面（一覧・詳細）
  - リアルタイムプログレス表示
  - 結果の可視化（カード形式）
  - 下書き編集の改善

### 3. 処理フローの最適化
- **問題**: Perplexityコストと時間
- **解決策**:
  - DBからの再開機能強化
  - 部分実行の容易化
  - キャッシュではなくDB永続化

## 新しいアーキテクチャ

### 1. セッション実行API
```typescript
// 既存の処理を維持しつつ、デバッグモードを追加
POST /api/viral/cot-session/[sessionId]/process
{
  "debugMode": true,        // DB保存済みデータを優先
  "skipPhases": [1, 2],    // スキップするフェーズ
  "forcePhase": 3,         // 特定フェーズから開始
  "useCache": false        // 常にDBから読み込み
}
```

### 2. デバッグ専用API
```typescript
// 個別ステップの実行
POST /api/viral/cot-session/[sessionId]/debug/[phase]/[step]
{
  "mockData": {...},       // テストデータ
  "saveToDb": true,        // 結果をDBに保存
  "dryRun": false         // 実行のみ（保存しない）
}
```

### 3. セッション管理UI

#### a) セッション一覧 `/viral/cot/sessions`
- 進行中/完了/失敗セッションの一覧
- フィルタリング（日付、ステータス、分野）
- 一括操作（再開、削除、複製）

#### b) セッション詳細 `/viral/cot/sessions/[sessionId]`
- リアルタイムプログレス表示
- 各フェーズの結果を展開可能なカード
- JSONビューアー統合
- 部分再実行ボタン

#### c) 下書き管理 `/viral/cot/drafts`
- 3つのコンセプトを並列表示
- インライン編集
- 文字数カウント（リアルタイム）
- プレビュー表示
- 一括投稿スケジューリング

### 4. デバッグツールの統合

#### a) DB Inspector
```javascript
// scripts/cot-inspect.js
- セッションの完全な状態表示
- 各フェーズのデータ確認
- エラー履歴
- トークン使用量分析
```

#### b) Quick Test Runner
```javascript
// scripts/cot-quick-test.js
- 単一フェーズの高速テスト
- モックデータでの実行
- プロンプトの微調整
- 結果の比較
```

#### c) Session Manager
```javascript
// scripts/cot-manage.js
- セッションの状態リセット
- 部分的な再実行
- データのエクスポート/インポート
- バックアップ機能
```

## 実装優先順位

### Phase 1（即座に実装）
1. デバッグモード付きAPIの実装
2. DB保存結果の再利用強化
3. 部分実行機能の追加

### Phase 2（UI改善）
1. セッション管理画面の刷新
2. リアルタイムプログレス表示
3. 下書き編集UIの改善

### Phase 3（ツール整備）
1. デバッグツールの統合
2. パフォーマンス分析
3. 自動テストスイート

## 技術的な考慮事項

### 1. 永続サーバーでの開発
- `npm run dev` を起動したまま
- ホットリロード無効化（必要に応じて）
- DB接続プールの最適化

### 2. エラーハンドリング
- 詳細なエラーログ
- 自動リトライの改善
- 部分的な成功の処理

### 3. パフォーマンス
- Perplexity呼び出しの最小化
- DB保存データの積極的な再利用
- トークン使用量の最適化

## まとめ

現在のDBスキーマとコア機能は優秀なので、これらを活かしつつ：
1. **デバッグ効率を最優先**で改善
2. **UIは必要最小限**の刷新
3. **DB中心**の開発フローを確立

これにより、「カンマひとつ直すのに5分」という問題を解決し、効率的な開発を実現します。