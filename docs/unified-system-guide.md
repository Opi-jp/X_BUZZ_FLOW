# X_BUZZ_FLOW 統合システムガイド

## 🚀 新機能の概要

### 1. 統合ダッシュボード
- **URL**: `/viral/v2/dashboard`
- **機能**:
  - バイラルコンテンツ、ニュース、スケジュールを一元管理
  - リアルタイムで更新される統計情報
  - クイックアクションで素早く操作

### 2. 10大ニュース生成
- **API**: `POST /api/viral/v2/news/top10`
- **機能**:
  - AIが重要度を判断して10大ニュースをランキング
  - キャラクター（カーディ・ダーレ）での投稿生成
  - スレッド形式と単一投稿形式に対応

### 3. スマートセルフRT機能
- **URL**: `/viral/v2/smart-scheduler`
- **戦略**:
  - 6時間後スパイク: エンゲージメントのピーク後に再活性化
  - 翌日リマインダー: 追加情報付きでRT
  - 週末リバイバル: 深い洞察を追加
  - カーディの一言: キャラクターの皮肉な視点

### 4. データエクスプローラー
- **URL**: `/viral/v2/data-explorer`
- **機能**:
  - 過去のトピック、コンセプト、ニュースを検索
  - ドラッグ&ドロップで新規セッション作成
  - パフォーマンススコアで並び替え

### 5. ニュースからバイラル変換
- **API**: `POST /api/viral/v2/news/to-viral`
- **機能**:
  - ニュース記事を選んでバイラルコンテンツに変換
  - 既存セッションに追加または新規作成
  - 関連性スコアを自動計算

## 📊 データベース最適化

### 新しいテーブル
1. **scheduled_retweets**: セルフRT管理
2. **unified_performance**: 統一パフォーマンス追跡
3. **news_viral_relations**: ニュースとバイラルの関連
4. **session_activity_logs**: セッション活動ログ
5. **api_error_logs**: APIエラー追跡

### 拡張されたテーブル
- **character_profiles**: ニュース関連の設定追加
- **viral_drafts_v2**: ソースURL追加
- **news_articles**: カテゴリと重要度追加

## 🛠️ 開発ツール

### 1. データベース管理
```bash
# DB状態チェック
node scripts/db-manager.js status

# 必要なマイグレーション実行
node scripts/db-manager.js migrate

# 問題を自動修正
node scripts/db-manager.js fix
```

### 2. 開発環境管理
```bash
# インタラクティブ起動
node scripts/dev-tools.js start

# ヘルスチェック
node scripts/dev-tools.js check

# 自動修正
node scripts/dev-tools.js fix

# 特定機能のテスト
node scripts/dev-tools.js test viral
```

### 3. リファクタリング支援
```bash
# 影響範囲分析
node scripts/refactor-helper.js analyze "ComponentName"

# 一括リネーム
node scripts/refactor-helper.js rename "oldName" "newName"

# バックアップ作成
node scripts/refactor-helper.js backup
```

### 4. 自動Proceed
```bash
# npm installなどで自動的にEnter
npm install | python scripts/auto-proceed.py

# カスタムパターン
command | python scripts/auto-proceed.py --pattern "continue"
```

## ⚡ Vercel Cronジョブ

### 設定済みのCronジョブ
1. **CoTセッション処理**: 2分ごと
2. **予約投稿**: 5分ごと
3. **予約RT**: 10分ごと
4. **ニュース収集**: 6時、12時、18時
5. **パフォーマンス収集**: 30分ごと

### 環境変数（必須）
```env
# Cron認証
CRON_SECRET=your-secret-key

# Twitter API（RT機能用）
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_SECRET=xxx

# AI APIs
OPENAI_API_KEY=xxx
CLAUDE_API_KEY=xxx

# オプション
NEWSAPI_KEY=xxx  # ニュース収集用
```

## 🔧 エラーハンドリング

### 統一エラーハンドラー
```typescript
import { withErrorHandling } from '@/lib/api/error-handler'

export const GET = withErrorHandling(async (request) => {
  // APIロジック
}, {
  requiredEnvVars: ['DATABASE_URL', 'OPENAI_API_KEY']
})
```

### 非同期処理（タイムアウト対策）
```typescript
import { withAsyncHandler } from '@/lib/api/async-handler'

export const POST = withAsyncHandler(async (request) => {
  // 長時間処理
})
```

## 🎯 使用例

### 1. 毎日の10大ニュース自動生成
- Cronが朝6時に自動実行
- ダッシュボードで確認
- カーディ・ダーレの視点で投稿

### 2. バイラル投稿の最適化
1. バイラルセッション作成
2. コンテンツ生成
3. 投稿後、スマートRTスケジューラーで6時間後と翌日のRTを予約
4. パフォーマンスを自動追跡

### 3. データの再利用
1. データエクスプローラーで過去の成功コンテンツを検索
2. 高スコアのアイテムを選択
3. ドラッグ&ドロップで新規セッション作成
4. 過去の成功パターンを活用

## 📈 パフォーマンス最適化

### Vercel設定
- 長時間処理: maxDuration 300秒（Pro必須）
- Cronジョブ: maxDuration 60秒
- Edge Runtime使用でコールドスタート削減

### データベース最適化
- 適切なインデックス設定
- ビューで複雑なクエリを事前定義
- トリガーで自動更新

## 🚨 トラブルシューティング

### よくある問題と解決策

1. **マイグレーションエラー**
   ```bash
   node scripts/db-manager.js fix
   ```

2. **環境変数エラー**
   ```bash
   node scripts/dev-tools.js check
   ```

3. **タイムアウトエラー**
   - Vercel Proプランにアップグレード
   - または非同期モードを使用

4. **RT失敗**
   - Twitter APIレート制限を確認
   - CRON_SECRETが設定されているか確認

## 🎉 まとめ

この統合システムにより：
- **効率化**: ダッシュボードで全てを一元管理
- **自動化**: Cronジョブで定期タスクを自動実行
- **最適化**: セルフRTで投稿の寿命を延長
- **再利用**: 過去の成功データを活用
- **安定性**: エラーハンドリングとログで問題を素早く解決

開発のストレスを減らし、コンテンツ作成に集中できる環境が整いました！