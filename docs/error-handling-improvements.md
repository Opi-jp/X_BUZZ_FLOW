# エラーハンドリング改善ドキュメント

## 実施した改善内容（2025年6月16日）

### 1. モックデータの削除

#### async-worker-v2.js
- **変更前**: OpenAI APIエラー時にハードコードされたモックレスポンスを返していた
- **変更後**: エラーを適切に再スローし、上位で処理するように変更
- **影響**: システムが偽のデータで完走することを防止

#### orchestrated-cot-strategy.ts
- **変更前**: Perplexity検索失敗時に「失敗してもプロセスは継続」
- **変更後**: エラーを上位に伝播させて適切に処理
- **影響**: 検索失敗時にプロセスが停止し、リトライまたは失敗として記録

### 2. リトライ・再開機能の実装

#### 新規作成ファイル

1. **lib/session-retry-manager.ts**
   - 指数バックオフによるリトライ機能
   - セッションの再開可能性チェック
   - 部分的な結果の保存機能
   - エラー時の適切な状態管理

2. **app/api/viral/cot-session/[sessionId]/resume/route.ts**
   - 失敗・停止したセッションを再開するAPI
   - 進捗状態の確認
   - 非同期処理の再トリガー

### 3. 主要な機能

#### リトライ機能
```typescript
// 最大3回まで指数バックオフでリトライ
await sessionRetryManager.executeWithRetry(
  async () => await perplexitySearch(query),
  { sessionId, phase: 1, step: 'EXECUTE' }
)
```

#### 再開機能
```typescript
// セッションが再開可能かチェック
const canResume = await sessionRetryManager.canResumeSession(sessionId)

// 再開可能な条件:
// 1. FAILED状態でリトライ回数が上限未満
// 2. INTEGRATING/EXECUTING/THINKING状態で5分以上停止
// 3. 部分的な結果が保存されている
```

#### エラー処理の改善
- モックデータによるフォールバックを完全に削除
- エラーは適切に記録され、上位に伝播
- リトライ可能なエラーとそうでないエラーを区別

### 4. 使用方法

#### 失敗したセッションの再開
```bash
# セッションの再開
curl -X POST http://localhost:3000/api/viral/cot-session/{sessionId}/resume

# レスポンス例
{
  "success": true,
  "message": "Session resumption initiated",
  "sessionId": "...",
  "progress": {
    "completedPhases": [1, 2],
    "currentPhase": 3,
    "currentStep": "EXECUTE",
    "hasErrors": true
  }
}
```

#### セッション状態の確認
```bash
# 既存のstatus APIで詳細確認
curl http://localhost:3000/api/viral/cot-session/{sessionId}/async-status
```

### 5. 今後の改善提案

1. **Circuit Breaker パターンの実装**
   - 連続失敗時にサービスを一時的に停止
   - システム全体の安定性向上

2. **Dead Letter Queue の実装**
   - 最終的に失敗したセッションの記録
   - 後日の分析と改善に活用

3. **監視とアラート**
   - エラー率の監視
   - 異常なリトライパターンの検知

### 6. 注意事項

- **モックデータは完全に削除**: テスト時でも実際のAPIを使用
- **エラーは必ず処理**: 無視せずにリトライまたは失敗として記録
- **部分的な成功を許可しない**: 全フェーズが成功するまで完了としない

## まとめ

この改善により、システムは以下の状態になりました：
- ✅ モックデータで偽の完走をしない
- ✅ エラー時は適切にリトライする
- ✅ 失敗したセッションは再開可能
- ✅ 全ての結果が実際のAPIレスポンスに基づく