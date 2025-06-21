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

### 🎉 Phase 2完了（2025年6月21日）

#### 主要成果
- **16ステップフローシステム**: テーマ入力からTwitter投稿まで完全自動化
- **統一システム管理**: IDGenerator、ErrorManager、PromptManager、DBManagerによる中央集権化
- **DB-Frontend整合性**: Prismaモデル名・フィールド名の完全統一（snake_case）
- **型安全性向上**: TypeScript型定義統一によるランタイムエラー防止
- **効率的デバッグ手法**: 個別修正→系統的修正（ripgrep + sed）への転換

#### 技術的革新
- **Create→Draft→Postフロー**: Perplexity→GPT→Claude→Twitter投稿まで完全動作
- **リアルタイム進捗追跡**: Server-Sent Events による16ステップ可視化
- **包括的エラーハンドリング**: フェーズ別エラー分類と日本語メッセージ
- **一括修正ツール**: 75個のAPIファイルを系統的に修正完了

### ✅ 動作確認済み機能
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

### Context7 MCP連携（2025年6月21日追加）
Context7は、AIアシスタントと外部ツール・データソースを接続するMCP（Model Context Protocol）です。
- **ライブラリ検索**: React/Next.js関連ライブラリの検索とコードスニペット取得
- **プロジェクトコンテキスト管理**: セッション間での情報共有
- **X_BUZZ_FLOWでの活用例**:
  - React Tweet (/vercel/react-tweet) - ツイート埋め込み
  - React Spring (/pmndrs/react-spring) - アニメーション
  - React Window (/bvaughn/react-window) - 大量リスト最適化

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

## 🔮 Phase 3準備（2025年6月21日〜）

### 📋 システム全体デバッグ計画
**実行期間**: 2025年6月21日 〜 7月12日（4週間）

#### 6つの検証観点
1. **重複機能・コード検出**: API/ライブラリの重複排除
2. **エンドポイント最適化**: 78個→50個以下への削減
3. **DB-Schema-Frontend整合性**: 命名規則・型定義の完全統一
4. **未使用・重複関数削除**: コードクリーンアップ
5. **アーキテクチャ簡素化**: 複雑性要因の解消
6. **保守性向上**: フラットルート設計、明示的インターフェース

#### 緊急対応項目
- 循環依存解消（ビルド時間最適化）
- DB接続プール最適化（パフォーマンス改善）
- エラーハンドリング統一（統一システム管理の全面適用）
- 型安全性完全化（any型排除、Zodスキーマ統一）

詳細計画: `/docs/current/system-debug-plan-20250621.md`

### 🎯 UX Enhancement準備
技術負債解消後に実装予定：
- アニメーション・トランジション
- モバイル対応（レスポンシブデザイン）
- PWA対応（オフライン機能）
- パフォーマンス最適化