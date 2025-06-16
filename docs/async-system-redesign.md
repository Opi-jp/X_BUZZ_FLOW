# 非同期システム再設計ドキュメント

## 現状の問題点

### 1. ワーカーを待つ設計になっている
- **問題**: ワーカーの処理を待つ同期的な動作
- **原因**: 
  - AsyncApiProcessor（プロセス内）とasync-worker-v2.js（外部プロセス）の二重処理
  - 両方が同じデータベースをポーリング
  - 競合状態が発生する可能性

### 2. イベント駆動ではない
- **問題**: ポーリングベースの実装
- **影響**: 
  - 無駄なDB接続
  - レスポンスの遅延
  - リソースの浪費

## 新しい設計方針

### 1. トリガー方式の実装
```
APIレスポンス受信 → 自動的に次のステップをトリガー
（ポーリングではなくイベント駆動）
```

### 2. フェーズ進行の制御
- **ステップ内（THINK→EXECUTE→INTEGRATE）**: 自動進行
- **フェーズ間（Phase1→Phase2）**: マニュアル制御
  - ユーザーが途中結果を確認できるように

### 3. エラー時の再開
- DBに保存されたデータから自動再開
- 最後に成功したステップから継続

## 実装アーキテクチャ

### A. シンプルなワーカーベースアプローチ（推奨）

```
1. API呼び出し（process-async）
   ↓
2. タスクをDBに保存
   ↓
3. ワーカーがタスクを取得・処理
   ↓
4. ワーカーが結果をDBに保存 + continue-asyncを呼び出し
   ↓
5. continue-asyncが次のステップを判断
   ↓
6. ステップ内なら自動でprocess-asyncを呼び出し
   フェーズ完了なら停止（マニュアル待ち）
```

### B. PostgreSQL LISTEN/NOTIFYアプローチ（将来的な改善）

```sql
-- タスク完了時の通知
CREATE OR REPLACE FUNCTION notify_task_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' THEN
    PERFORM pg_notify('task_completed', json_build_object(
      'task_id', NEW.id,
      'session_id', NEW.session_id,
      'result', NEW.result
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_complete_trigger
AFTER UPDATE ON api_tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_complete();
```

## 実装手順

### Phase 1: ワーカーの単純化（即実施）

1. **AsyncApiProcessorの無効化**
   - プロセス内ポーリングを停止
   - 外部ワーカーのみを使用

2. **continue-asyncの改善**
   ```typescript
   // 環境変数で制御
   AUTO_PROGRESS_STEPS=true    // ステップ内自動進行
   AUTO_PROGRESS_PHASES=false  // フェーズ間手動制御
   ```

3. **エラーハンドリング**
   - リトライロジックの統一
   - 部分的な結果の保存

### Phase 2: 進行状態の可視化

1. **進行状態API**
   ```typescript
   GET /api/viral/cot-session/{sessionId}/progress
   {
     "currentPhase": 2,
     "currentStep": "EXECUTE",
     "completedPhases": [1],
     "canProceed": true,
     "requiresManualTrigger": false
   }
   ```

2. **手動進行API**
   ```typescript
   POST /api/viral/cot-session/{sessionId}/proceed-next-phase
   ```

### Phase 3: 監視とログ

1. **タスク処理の監視**
   - 処理時間の記録
   - エラー率の追跡
   - ボトルネックの特定

2. **デバッグ情報**
   - 各ステップの入出力
   - エラーの詳細
   - リトライ履歴

## 設定例

```env
# 非同期処理の設定
WORKER_ENABLED=true              # ワーカーを有効化
AUTO_PROGRESS_STEPS=true         # ステップ内自動進行
AUTO_PROGRESS_PHASES=false       # フェーズ間手動制御
MAX_RETRIES=3                    # 最大リトライ回数
RETRY_DELAY=1000                 # リトライ間隔（ミリ秒）

# ワーカー設定
WORKER_POLL_INTERVAL=5000        # ポーリング間隔
WORKER_BATCH_SIZE=1              # 同時処理タスク数
WORKER_TIMEOUT=300000            # タスクタイムアウト（5分）
```

## 移行計画

### Week 1
- [ ] AsyncApiProcessorの無効化
- [ ] continue-asyncの環境変数対応
- [ ] 手動進行APIの実装

### Week 2
- [ ] 進行状態APIの実装
- [ ] エラーからの自動再開
- [ ] UIの更新

### Week 3
- [ ] 監視システムの実装
- [ ] パフォーマンス最適化
- [ ] ドキュメント更新

## 期待される効果

1. **レスポンス向上**: ポーリング削除により即座に反応
2. **リソース削減**: 無駄なDB接続の削除
3. **信頼性向上**: 競合状態の解消
4. **ユーザビリティ**: 途中結果の確認が可能