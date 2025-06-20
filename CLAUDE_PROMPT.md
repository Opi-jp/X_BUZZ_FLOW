# 🤖 Claude作業開始プロンプト（コピペ用）

以下をコピーして新しいClaude会話の最初に貼り付ける：

---

# X_BUZZ_FLOW 作業開始

## 1️⃣ 10秒でプロジェクト状態を把握
```bash
# 統合ステータスチェック（1コマンドで全体把握）
node scripts/dev-tools/project-status.js

# 直近の作業内容確認
git log --oneline -10 --graph --decorate

# 現在のブランチと変更状況
git status -sb
```

## 2️⃣ 必須ファイルの確認（優先順位順）
```bash
# 1. エラー解決集を先に見る（同じ問題を繰り返さない）
cat ERRORS.md | head -50

# 2. Claude専用ガイド（開発環境・ツール）
cat CLAUDE.md | grep -A 20 "## 🚀 クイックスタート"

# 3. 統合マスタードキュメント（迷ったらこれ）
cat MASTER_DOC.md | head -100
```

## 3️⃣ 開発環境の起動
```bash
# Claude-dev統合環境（推奨）- エラー監視・ビルド監視付き
./scripts/dev-persistent-enhanced.sh

# または通常の永続サーバー
./scripts/dev-persistent.sh
```

## 4️⃣ 現在のシステム状態確認
```bash
# DB接続とスキーマ状態
node scripts/dev-tools/db-schema-validator.js --quick

# API依存関係（重複・未使用を検出）
node scripts/dev-tools/api-dependency-scanner.js --summary

# セッションとフローの状態
node scripts/dev-tools/flow-visualizer.js --summary

# ビルド状態
npm run build:check || echo "ビルドエラーあり"
```

## 5️⃣ よく使う開発コマンド
```bash
# エラー検索（過去の解決策を探す）
node scripts/dev-tools/find-error.js "エラーキーワード"

# エラー記録（新しいエラーを記録）
node scripts/dev-tools/smart-error-recorder.js

# プロンプト確認・編集
node scripts/dev-tools/prompt-editor.js list
node scripts/dev-tools/prompt-editor.js edit [ファイル名]

# E2Eフローテスト
node scripts/dev-tools/e2e-flow-tester.js
```

## ⚠️ 開発の鉄則
1. **ポート3000必須**（Twitter認証の制約）
2. **エラーは必ず記録**（同じエラーを繰り返さない）
3. **既存ツールを使う**（新しいスクリプトを作らない）
4. **問題の根本解決**（モックやダミーで回避しない）

## 🚫 絶対にやってはいけないこと
- ❌ DB接続エラーをモックデータで回避
- ❌ 一時的なテストスクリプトの乱造
- ❌ 新規ドキュメントの作成
- ❌ npm run dev（永続サーバーを使う）
- ❌ エラーの「詳細は後で追記」

## 📊 現在の主要システム（2025年6月時点）

### 統合システムアーキテクチャ
```
[収集] → [分析] → [生成] → [配信] → [評価]
Intel → Create → Publish → Analyze → Optimize
```

### 各モジュールの状態
1. **Intel（インテリジェンス）** ✅ 
   - News: ニュース収集・分析（完全動作）
   - Social: KaitoAPI連携（完全動作）
   - Trends: トレンド検出（実装中）

2. **Create（クリエーション）** ✅ 
   - Flow: Perplexity→GPT→Claude（完全動作）
   - Draft: 下書き管理（完全動作）
   - Persona: キャラクター生成（完全動作）

3. **Publish（パブリッシュ）** ✅
   - Post: Twitter投稿（完全動作）
   - Schedule: スケジュール管理（完全動作）

4. **Analyze（アナライズ）** ⚠️
   - Performance: パフォーマンス分析（UI実装済み）
   - Insights: インサイト生成（データ接続待ち）

---

このプロンプトを実行後、具体的な作業内容を教えてください。