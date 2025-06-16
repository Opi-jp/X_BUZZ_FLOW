# 非同期APIシステム実装の引き継ぎ事項

## 実装完了項目（2025年6月16日）

### 1. AsyncApiProcessor（非同期API処理システム）
- **ファイル**: `/lib/async-api-processor.ts`
- **機能**:
  - GPTとPerplexity APIの非同期キュー処理
  - タスクの並列実行とリトライ機能
  - バックグラウンドワーカーによる処理
- **使用方法**:
  ```typescript
  const processor = AsyncApiProcessor.getInstance()
  const taskId = await processor.queueTask('GPT_COMPLETION', sessionId, phaseNumber, stepName, request)
  ```

### 2. CotSessionManager（セッション管理・復旧システム）
- **ファイル**: `/lib/cot-session-manager.ts`
- **機能**:
  - セッションヘルスチェック
  - 失敗時の自動復旧とリトライ
  - フェーズ単位での再実行
- **使用方法**:
  ```typescript
  const manager = CotSessionManager.getInstance()
  const health = await manager.checkSessionHealth(sessionId)
  await manager.retrySession(sessionId)
  ```

### 3. 新規APIエンドポイント
- `/api/viral/cot-session/[sessionId]/process-async` - 非同期処理開始
- `/api/viral/cot-session/[sessionId]/continue-async` - タスク完了後の継続処理
- `/api/viral/cot-session/[sessionId]/async-status` - 非同期ステータス確認
- `/api/viral/cot-session/[sessionId]/recover` - セッション復旧

### 4. ワーカープロセス
- **ファイル**: `/scripts/async-worker-v2.js`
- **起動方法**: `node scripts/async-worker-v2.js`
- **機能**: 
  - キューされたAPIタスクを処理
  - 完了後にcontinue-asyncを自動呼び出し
  - 重複処理防止機能付き

## 残存する問題

### 1. sessionId undefined問題
- **症状**: continue-asyncエンドポイントでsessionIdがundefinedになる
- **原因**: Next.js 15のAPI route params処理の変更
- **修正済み箇所**:
  - `const resolvedParams = await params`
  - `const sessionId = resolvedParams.sessionId`
- **未修正箇所**: 他のエンドポイントでも同様の修正が必要な可能性

### 2. フェーズ作成問題
- **症状**: THINKステップ完了後もフェーズが作成されない
- **原因**: continue-asyncの条件判定が正しく動作していない
- **調査必要**: `metadata?.currentTaskId === taskId`の条件

### 3. 自動進行の不完全性
- **現状**: 各ステップ後に手動でprocess-asyncを呼ぶ必要がある
- **理想**: continue-asyncが次のステップを自動的にキューする

## データベーステーブル

### api_tasksテーブル
```sql
CREATE TABLE IF NOT EXISTS api_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  session_id VARCHAR(50) NOT NULL,
  phase_number INTEGER NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  request JSONB NOT NULL,
  response JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  retry_count INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

## テスト方法

### 1. 基本的な非同期テスト
```bash
# ワーカー起動（別ターミナル）
node scripts/async-worker-v2.js

# テスト実行
node test-async-complete.js
```

### 2. デバッグテスト
```bash
node test-async-debug.js
```

### 3. セッション復旧テスト
```bash
node test-recovery.js
```

## 次のステップ

1. **continue-asyncの完全実装**
   - THINKからEXECUTEへの自動遷移
   - 各フェーズ完了後の自動進行

2. **エラーハンドリングの改善**
   - sessionId undefined問題の根本解決
   - より詳細なエラーログ

3. **パフォーマンス最適化**
   - ワーカーの並列処理数調整
   - タスクキューの最適化

4. **本番環境対応**
   - Vercelでのワーカー実行方法検討
   - Cronジョブとの統合

## 重要な注意事項

1. **開発環境での注意**
   - Cronジョブは開発環境では無効化されている
   - ワーカープロセスは手動起動が必要

2. **APIコスト削減**
   - Perplexityは1回70秒程度かかる
   - モック実装を活用してテスト

3. **セッション状態管理**
   - 2分以上更新がないセッションは自動スキップ
   - 失敗したセッションは最大5回までリトライ

## ユーザーからのフィードバック

- 「基本的な実装エラーはローカルでキャッチすべき」
- 「エラー時はスキップではなくリトライか再開を実装すべき」
- 「Perplexityはコストがかかるのでトリガーベースにしたい」
- 「外部APIは非同期・トリガー方式の方が良い」

これらの要望に基づいて実装を行いました。