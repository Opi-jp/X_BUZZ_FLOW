# X_BUZZ_FLOW - AIバイラルコンテンツシステム

## ✅ Create→Draft→Post フロー実装完了！

### 🎉 2025年6月20日達成
- **完全フロー動作**: テーマ入力→トピック収集→コンセプト生成→キャラクター選択→下書き作成→Twitter投稿
- **実際のTwitter投稿成功**: Create→Draft→Postフローで実際の投稿を確認
- **autoProgress機能**: E2Eテスト用の自動進行モード実装
- **LLM応答時間対応**: 各フェーズに適切な待機時間を設定

## 🚨 重要：最初にこれを読め！

### 🛑 最軽量版（NEW）
```bash
# Claudeの自動読み込みを止める
cat START_HERE.md
```

### 🚀 軽量版
```bash
# 最小限の情報
cat QUICK_START.md
```

### 📚 詳細版（必要に応じて）
```bash
cat CLAUDE.md      # 詳細な手順
cat MASTER_DOC.md  # システムの現状
cat ERRORS.md      # エラー解決集
```

**軽量版で十分。詳細は必要になってから。**

## 🆕 統一システム管理（2025年6月20日追加）

開発の一貫性を保つための中央管理システムを導入しました。

### 使い方
```typescript
import { IDGenerator, EntityType, ErrorManager } from '@/lib/core/unified-system-manager'

// ID生成（プレフィックス付き）
const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)  // sess_xxxxxxxxxxxx

// エラーハンドリング
try {
  // 処理
} catch (error) {
  const errorId = await ErrorManager.logError(error, {
    module: 'create',
    operation: 'generate-concepts'
  })
}
```

詳細: `/lib/core/unified-system-usage-guide.md`

## 🎯 クイックリファレンス

### 開発を始める
```bash
# 永続サーバーの起動（必須）
./scripts/dev-persistent.sh

# エラーが出たら
node scripts/dev-tools/find-error.js "エラー内容"

# フロントエンドデバッグ（NEW!!）
node scripts/dev-tools/unified-frontend-debugger.js  # 統合デバッガー
node scripts/dev-tools/vscode-error-monitor.js      # VSCodeエラーモニター

# プロンプトを編集する（NEW）
node scripts/dev-tools/prompt-editor.js list
node scripts/dev-tools/prompt-editor.js edit gpt/generate-concepts.txt

# プロンプトを直接実行（非インタラクティブ）
node scripts/dev-tools/prompt-editor.js test-direct perplexity/collect-topics.txt \
  theme="AIと働き方" platform=Twitter style=エンターテイメント --non-interactive

# DB整合性チェック＆マイグレーション（NEW!）
node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt
node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt --non-interactive --auto-migrate
node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt --non-interactive --cleanup

# ⚠️ 重要：プロンプトエディターの使い方
# 1. 変数プレビュー（メニュー4）で使用される変数を確認
# 2. JSON検証（メニュー5）で問題のある記述を確認
# 3. DB互換性チェック（compatコマンド）でデータ整合性を確認
# 4. 問題がある場合はマイグレーションで自動修正
# 5. test-directコマンドで非インタラクティブ実行が可能
```

### 使うAPI（2025年1月19日更新 - シンプル化完了）
```
# Create→Draft→Post フロー（実装完了✅）
フロー開始:   POST /api/flow
状態確認:     GET  /api/flow/[id]
次へ進む:     POST /api/flow/[id]/next
下書き一覧:   GET  /api/drafts
下書き編集:   PUT  /api/drafts/[id]
投稿実行:     POST /api/post

# UI（完全実装済み）
新規作成:     /create             # テーマ入力
進行状況:     /create/flow/[id]   # リアルタイム進行状況
下書き管理:   /drafts             # 編集・投稿・削除
```

## 技術スタック

- **Frontend**: Next.js 15.3 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase) + ChromaDB
- **ORM**: Prisma
- **AI**: Claude API, Kaito API
- **Deployment**: Vercel

## 主要機能（2025年6月19日現在）

### ✅ 実装完了
1. **Create→Draft→Post フロー**: テーマ入力→Perplexity→GPT→Claude→下書き→投稿
2. **キャラクター投稿**: カーディ・ダーレ等のペルソナでの投稿生成
3. **下書き管理**: 編集・削除・投稿機能
4. **リアルタイム進行状況**: 各フェーズの結果表示

### 🔄 既存システム（動作中）
1. バズ投稿収集（Kaito API）
2. ニュース記事収集・分析
3. 投稿スケジューリング
4. パフォーマンス分析

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envファイルを編集

# データベースセットアップ
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

## 環境変数

```
# Database
DATABASE_URL=
DIRECT_URL= # Prismaマイグレーション用

# AI APIs
CLAUDE_API_KEY=
KAITO_API_KEY=

# Authentication
NEXTAUTH_URL=
NEXTAUTH_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# News APIs
NEWSAPI_KEY=

# Cron Jobs
CRON_SECRET= # Vercel Cron Job認証用
```

## 定時実行設定

毎日朝6時（JST）にRSS収集を自動実行：

1. Vercel環境変数に`CRON_SECRET`を設定（ランダムな文字列）
2. デプロイ後、Vercelダッシュボードで確認

## 📋 最新の更新（2025年6月19日）

### 🚀 V2バイラルコンテンツ生成システム完成
- **完全動作中**: 2トピック×6コンセプト版が稼働
- **新UIフロー**: 
  - `/generation/content` - コンテンツ生成開始
  - `/generation/content/concept-select/[id]` - コンセプト選択
  - `/generation/content/character-select/[id]` - キャラクター選択
  - `/generation/content/results/[id]` - 結果表示
- **下書き管理**: `/generation/drafts`
- **スケジューラー**: `/generation/schedule`
- **パブリッシャー**: `/automation/publisher`

### 🔧 開発効率化ツール群
- **統合フロントエンドデバッガー**: 
  ```bash
  node scripts/dev-tools/unified-frontend-debugger.js
  # http://localhost:3335 でエラー監視・リンクチェック・AI分析
  ```
- **VSCodeエラーモニター**: ターミナルでリアルタイムエラー表示
- **リアルタイムコードチェッカー**: ファイル保存時の構文チェック
- **UIビヘイビアテスター**: ボタン・リンクの動作テスト

### 🐛 APIエラー修正（2025年6月19日）
- **Perplexity collect APIの修正**: 
  - `perplexityData`フィールドを正しい`topics`フィールドに変更
  - Perplexityの生データをそのまま保存（JSON解析不要）
  - プロンプトエディターで動作確認済み
- **開発ツールの活用**:
  - プロンプトエディターでDB整合性チェック実施
  - API依存関係スキャナーで使用状況確認
  - エラーレコーダーで問題を記録（今回はエラーなし）

### 🎯 今後の実装予定
- 9つの組み合わせ（3フック×3角度）から選択するUI
- GPTによるスコアリングと推薦機能
- 物語構造の選択的生成

### 🔧 CoTシステムバックエンド修正（2025年6月19日 午後）
- **ステータス管理統一**: すべて大文字（CREATED, TOPICS_COLLECTED等）に
- **Perplexityパーサー実装**: 
  - `PerplexityResponseParser`クラスを新規作成
  - Markdown内のJSONブロック抽出
  - 改行文字のエスケープ処理
- **インポートパス統一**: `@/lib/prisma`に全て統一
- **エラー記録**: 3件のパース関連エラーを記録・解決

### 🚀 新APIモジュール実装とTwitter投稿成功（2025年1月19日）
- **新モジュール構造の実装開始**:
  - `/api/create/flow/complete` - 完全フロー（Perplexity→GPT→Claude）実装
  - `/api/publish/post/now` - 即時投稿API実装
  - Intel/Create/Publish/Analyzeの4モジュール構成を採用
- **Twitter投稿テスト成功**:
  - 実際にTwitterに2件の投稿成功！
  - カーディ・ダーレのキャラクターで投稿
  - middleware.tsのリダイレクト問題を解決
- **システム状態確認**:
  - セッション: 30件（各ステータスに分散）
  - 下書き: 36件（DRAFT状態）
  - 投稿済み: 3件（実際のTwitter URL付き）

詳細はCLAUDE.mdの作業記録を参照してください。