# 🤖 Claude作業開始プロンプト（コピペ用）

以下をコピーして新しいClaude会話の最初に貼り付ける：

---

# X_BUZZ_FLOW 作業開始

## 🚨 作業開始前の必須手順（エラーキャプチャ起動）
```bash
# バックエンドエラー監視を起動（APIエラーを自動記録）
node scripts/dev-tools/backend-error-capture.js &

# フロントエンドエラー監視を起動（ブラウザエラーを自動記録）
node scripts/dev-tools/auto-error-capture.js &

# 既存のエラーを確認
node scripts/dev-tools/claude-check-errors.js
```

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

## 3️⃣ 現在動作中のシステム確認
```bash
# API使用状況（重複を防ぐ）
node scripts/dev-tools/api-dependency-scanner.js

# DB整合性チェック
node scripts/dev-tools/db-schema-validator.js

# セッション状態確認
node scripts/dev-tools/flow-visualizer.js
```

## 4️⃣ 主要システムの動作確認URL
- http://localhost:3000/mission-control - 統合ダッシュボード
- http://localhost:3000/create - Create→Draft→Postフロー
- http://localhost:3000/intelligence/news - NEWSシステム
- http://localhost:3555 - Prisma Studio（DB確認）

## 5️⃣ よく使うコマンド
```bash
# プロンプト編集
node scripts/dev-tools/prompt-editor.js list

# エラー記録（手動）
node scripts/dev-tools/smart-error-recorder.js

# ビルド監視
node scripts/dev-tools/build-monitor.js
```

## ⚠️ 重要な注意事項
1. **永続サーバーを使用**: `./scripts/dev-persistent-enhanced.sh`
2. **ポート3000必須**: Twitter OAuth認証の制約
3. **エラーキャプチャは必ず起動**: 問題の早期発見のため
4. **同じエラーを繰り返さない**: ERRORS.mdを先に確認
5. **APIの重複を防ぐ**: 新規作成前にapi-dependency-scannerで確認

---

以上をコピーして使用してください。