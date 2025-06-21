# X_BUZZ_FLOW

AIを使ったTwitterバイラルコンテンツ生成システム。

## 🚀 クイックスタート

### 開発環境の起動
```bash
# Claude-dev統合開発環境（推奨）
./scripts/dev-persistent-enhanced.sh

# 🚨 重要：作業開始時に必ずエラーキャプチャを起動
node scripts/dev-tools/backend-error-capture.js &  # バックエンドエラー監視
node scripts/dev-tools/auto-error-capture.js &     # フロントエンドエラー監視
```

### 重要ドキュメント
```bash
cat START_HERE.md      # エントリーポイント
cat CLAUDE.md          # Claude専用開発ガイド
cat ERRORS.md          # エラー解決集
```

## 📊 システム状態（2025年6月21日）

### ✅ 動作確認済み機能
- **Create→Draft→Postフロー**: Perplexity→GPT→Claude→Twitter投稿まで完全動作
- **スレッド投稿**: 5投稿+Source Tree（計6ツイート）の自動生成・投稿
- **永続サーバー環境**: tmux xbuzzで安定稼働
- **エラー監視システム**: 自動エラーキャプチャとスマート記録
- **DB整合性**: Prismaスキーマと実DBが完全同期

### 🔧 最近の修正（2025年6月21日）
- **viral_drafts_v2 → viral_drafts**: テーブル名からV2サフィックスを削除
- **スレッド投稿実装**: thread_structure フィールドで複数投稿を管理（5投稿+Source Tree=6ツイート）
- **Source Tree機能改善**: 
  - Perplexity表記を削除（「最新の情報源から」に変更）
  - 出典情報なしの場合は投稿を中止（信頼性確保）
  - 複数出典対応：URLの切断問題を解決（各出典を個別ツイートに分割）
- **DBマネージャー活用**: スキーマ変更をdb-managerツールで実施
- **カーディ・ダーレ キャラクター調整**: 
  - AIへの姿勢を批判的から実用的・中立的に変更
  - 「詐欺師」→「詐欺師的な思考の持ち主」に表現緩和
  - 愚痴から「皮肉の形をとった正論」スタイルへ転換

## 🛠 開発ツール

### エラー記録システム
```bash
# スマートエラー記録（対話的）
node scripts/dev-tools/smart-error-recorder.js

# 自動エラーキャプチャ（バックグラウンド）
node scripts/dev-tools/auto-error-capture.js

# バックエンド専用エラーモニター（NEW: 2025/06/20）
node scripts/dev-tools/backend-error-capture.js  # tmuxとログを監視

# Claudeでエラー状況確認
node scripts/dev-tools/claude-check-errors.js
```

### ビルド監視
```bash
# ビルドエラーをClaude形式で出力
node scripts/dev-tools/build-monitor.js
```

### その他のツール
- API依存関係スキャナー
- DB整合性チェッカー
- プロンプトエディター
- 統合監視ダッシュボード

詳細は `CLAUDE.md` を参照してください。