# X_BUZZ_FLOW ドキュメント

## 📁 ディレクトリ構成

- **[core/](./core/)** - コアドキュメント（仕様書・設計思想）
- **[development/](./development/)** - 開発関連（環境構築・テスト・非同期処理）
- **[deployment/](./deployment/)** - デプロイメント（Vercel・本番環境）
- **[troubleshooting/](./troubleshooting/)** - トラブルシューティング
- **[api-integration/](./api-integration/)** - 外部API連携
- **[archive/](./archive/)** - アーカイブ（古いドキュメント）

## 🎯 最重要ドキュメント
- [core/chain-of-thought-specification.md](./core/chain-of-thought-specification.md) - Chain of Thought仕様書 v2
- [CLAUDE.md](../CLAUDE.md) - Claudeセッション用の作業記録と指示書

### 🏗️ システム設計
- [system-architecture.md](./system-architecture.md) - システムアーキテクチャ
- [viral-system-architecture.md](./viral-system-architecture.md) - バイラルシステムアーキテクチャ
- [gpt-viral-system-design.md](./gpt-viral-system-design.md) - GPTバイラルシステム設計

### 🔄 Chain of Thought関連
- [chain-of-thought-specification.md](./chain-of-thought-specification.md) - 仕様書（原本）✨
- [chain-of-thought-specification-v2.md](./chain-of-thought-specification-v2.md) - 仕様書v2（Phase 2&3統合版）
- [chain-of-thought-implementation.md](./chain-of-thought-implementation.md) - 実装ガイド
- [cot-implementation-principles.md](./cot-implementation-principles.md) - 実装原則
- [cot-implementation-validation.md](./cot-implementation-validation.md) - 実装検証
- [cot-implementation-status.md](./cot-implementation-status.md) - 実装ステータス
- [cot-system-redesign.md](./cot-system-redesign.md) - システム再設計

### 🚀 非同期処理システム
- [async-system-redesign.md](./async-system-redesign.md) - 非同期システム再設計 ✨
- [async-system-handoff.md](./async-system-handoff.md) - 非同期システム引き継ぎ
- [database-session-improvement-plan.md](./database-session-improvement-plan.md) - DBセッション改善計画

### 🗄️ データベース関連
- [db-frontend-consistency.md](./db-frontend-consistency.md) - DB・フロントエンド整合性ガイド ✨
- [db-testing-checklist.md](./db-testing-checklist.md) - DBテストチェックリスト
- [migration-plan.md](./migration-plan.md) - マイグレーション計画

### 🚢 デプロイメント
- [production-deployment-guide.md](./production-deployment-guide.md) - 本番デプロイガイド
- [vercel-deployment-guide.md](./vercel-deployment-guide.md) - Vercelデプロイガイド
- [vercel-deployment-checklist.md](./vercel-deployment-checklist.md) - Vercelデプロイチェックリスト
- [vercel-env-vars.md](./vercel-env-vars.md) - Vercel環境変数
- [deployment-checklist.md](./deployment-checklist.md) - デプロイチェックリスト

### 🛠️ 開発・運用
- [dev-startup-procedure.md](./dev-startup-procedure.md) - 開発環境起動手順
- [script-inventory.md](./script-inventory.md) - スクリプト一覧 ✨
- [testing-principles.md](./testing-principles.md) - テスト原則
- [error-handling-improvements.md](./error-handling-improvements.md) - エラーハンドリング改善

### 🔧 トラブルシューティング
- [twitter-oauth-troubleshooting.md](./twitter-oauth-troubleshooting.md) - Twitter OAuth問題解決
- [twitter-oauth-fix.md](./twitter-oauth-fix.md) - Twitter OAuth修正
- [perplexity-timeout-fix.md](./perplexity-timeout-fix.md) - Perplexityタイムアウト修正

### 🔌 外部API連携
- [google-custom-search-setup.md](./google-custom-search-setup.md) - Google Custom Search設定
- [search-result-processing-discussion.md](./search-result-processing-discussion.md) - 検索結果処理の議論

### 💻 フロントエンド
- [frontend-implementation-plan.md](./frontend-implementation-plan.md) - フロントエンド実装計画
- [new-ui-design.md](./new-ui-design.md) - 新UIデザイン
- [system-integration-proposal.md](./system-integration-proposal.md) - システム統合提案

### 📝 作業記録
- [current-system-status.md](./current-system-status.md) - 現在のシステムステータス
- [deployment-session-20250613.md](./deployment-session-20250613.md) - デプロイセッション記録
- [deployment-session-20250613-v2.md](./deployment-session-20250613-v2.md) - デプロイセッション記録v2
- [implementation-summary-20250612.md](./implementation-summary-20250612.md) - 実装サマリー
- [implementation-summary-20250612-evening.md](./implementation-summary-20250612-evening.md) - 実装サマリー（夕方版）
- [step1-two-phase-implementation.md](./step1-two-phase-implementation.md) - Step1の2段階実装
- [key-documents-reference.md](./key-documents-reference.md) - 重要ドキュメントリファレンス

## 📋 ドキュメント管理ガイドライン

### 新規ドキュメント作成時
1. 適切なカテゴリーを選択
2. 命名規則: `kebab-case.md`
3. 冒頭に作成日と目的を記載
4. このREADMEに追加

### ドキュメント更新時
1. 更新日時を記録
2. 重要な変更は履歴セクションに記載
3. 古い情報は削除せず、打ち消し線で表示

### アーカイブ基準
- 3ヶ月以上更新されていない
- システムの現状と乖離している
- 同じ内容の新しいドキュメントが存在する

## 🌟 推奨閲覧順序

1. **初めての方**
   - CLAUDE.md → chain-of-thought-specification.md → system-architecture.md

2. **開発者**
   - dev-startup-procedure.md → db-frontend-consistency.md → async-system-redesign.md

3. **運用担当**
   - production-deployment-guide.md → script-inventory.md → error-handling-improvements.md

---
最終更新: 2025/06/16