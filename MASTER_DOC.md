# X_BUZZ_FLOW マスタードキュメント

このファイルは、79個のドキュメントを統合した「本当に必要な情報だけ」を記載したものです。

## 🎯 今すぐ知りたいこと

### Q: どのAPIを使えばいい？
```
セッション: /api/generation/content/sessions/[id]
下書き:     /api/generation/drafts/[id]
ニュース:   /api/intelligence/news/*
バズ分析:   /api/intelligence/buzz/*
投稿:       /api/twitter/post
```
※ 旧パス（/api/viral/*, /api/news/*, /api/buzz/*）は削除済み（2025/06/18）

### Q: エラーが出た
→ `ERRORS.md`を見る or `node scripts/dev-tools/find-error.js "エラー内容"`

### Q: プロンプトの書き方は？
- 自然文で指示、出力形式のみJSON
- 「物語性のある」などの修飾語は削除しない
- オリジナルから勝手に変更しない

### Q: DB接続できない
```bash
# 環境変数確認
node scripts/dev-tools/check-env.js

# 正しい設定
DATABASE_URL="...?pgbouncer=true"
DIRECT_URL="...?pgbouncer=true&connection_limit=1"
```

### Q: Twitter認証できない
- 必ずポート3000で実行（`./scripts/dev-persistent.sh`）
- Callback URL: `http://localhost:3000/api/auth/callback/twitter`

## 🔧 開発ツール一覧

```bash
# エラー検索
node scripts/dev-tools/find-error.js "キーワード"

# API依存関係確認  
node scripts/dev-tools/api-dependency-scanner.js

# ドキュメント検索
node scripts/dev-tools/doc-finder.js "キーワード"

# DB管理
node scripts/dev-tools/db-manager.js status
```

## 📋 現在のシステム構成

### メインシステム（2025年6月18日現在）
1. **V2バイラルシステム** ✅ 稼働中
   - Perplexity→GPT→Claudeの3段階
   - expertise→themeに変更済み
   - `/api/generation/content/sessions/*`を使用（旧viral/v2は削除）

2. **NEWSシステム** ✅ 稼働中
   - RSS収集とAI分析
   - `/api/intelligence/news/*`を使用（旧newsは削除）

3. **KaitoAPI** ✅ 稼働中
   - Twitter metrics収集（API制限回避）
   - バズ投稿の分析

### 命名規則（2025年6月18日に移行完了）
- ✅ **新構造への移行完了 - 旧ディレクトリは全て削除**
  - `/api/generation/content/session/*` - CoTシステム
  - `/api/generation/content/sessions/*` - V2セッション
  - `/api/generation/drafts/*` - 下書き管理
  - `/api/intelligence/news/*` - ニュース収集
  - `/api/intelligence/buzz/*` - バズ分析
  - `/api/automation/scheduler/*` - スケジュール管理
  - `/api/integration/mission-control/*` - ダッシュボード
- ⚠️ 旧パスは完全削除（リダイレクトなし、互換性破壊）
- 設計書: `/docs/current/naming-convention-redesign.md`

### 重要な設計書（例外的に参照OK）
- `/docs/current/naming-convention-redesign.md` - API整理の方針 ✅実装済(2025/06/18)
- `/docs/current/complete-system-integration-design.md` - システム統合設計 ⚠️部分実装
- `/docs/current/news-viral-integration-design.md` - ニュース連携設計 ❓実装状況不明
- `/docs/current/historical-tweet-analysis-plan.md` - 過去ツイート分析 ❌未実装

※ 設計書と実装がズレている可能性大。実装優先で判断すること。

## ⚠️ 古いドキュメントに注意

### 紛らわしいアーキテクチャドキュメント（3つもある！）
1. ❌ `/docs/core/viral-system-architecture.md` - 初期設計、古い
2. ⚠️ `/docs/core/gpt-viral-system-design.md` - ChatGPTプロンプト仕様（参考程度）
3. ✅ `/docs/core/system-architecture.md` - 最新（2025/6/14）、これが正しい

### その他のドキュメント
- `/docs/api-contracts.md` - API開発原則（重要部分は本ファイルに移行済み）
- `/docs/migration-plan.md` - 移行は保留中
- `/docs/api-migration-plan.md` - migration-planとほぼ同じ内容

正しい仕様は：
- システム構成 → `/docs/core/system-architecture.md`（最新）
- Chain of Thought仕様 → `/docs/core/chain-of-thought-specification.md`
- Chain of Thought理念 → `/docs/core/chain-of-thought-philosophy.md`（なぜこう作るか）
- プロンプト改善案 → `/docs/prompt-strategy-review-2025-06-17.md`（重要）
- 現在の実装 → このMASTER_DOC.mdを参照

### プロンプト戦略の重要ポイント（2025-06-17）
- 5フェーズ→3ステップに簡略化の提案
- Perplexity直接検索プロンプトの具体例
- スレッド形式の正しい実装方法（1/5形式）
- ワーカー不要（Vercel Proで同期処理可能）

## ⚠️ よくある罠

1. **フロントに合わせてAPIを退化させる**
   → APIファースト開発。フロントを新仕様に対応させる

2. **モックデータで回避**
   → 根本解決する。DBエラーはPrismaで対処

3. **同じ機能で複数API作成**
   → 既存APIを確認してから作る

4. **プロンプトを勝手に最適化**
   → オリジナルを尊重。削除も追加もしない

## 🚨 API開発の重要原則（api-contracts.mdより）

1. **APIファースト開発**
   - まずAPIの仕様を決める
   - フロントはAPIの仕様に従う
   - 「フロントが動かないからAPIを変える」は禁止

2. **バージョニング**
   - 新しいAPIは新しいパスで作る（例: v2, v3）
   - 古いAPIは非推奨（deprecated）としてマーク
   - 移行期間を設ける

3. **契約の記録**
   - API変更時は必ず記録を残す
   - フロント側の対応状況を追跡

4. **現在の未対応事項（2025/06/18）**
   - expertise → theme 移行（一部フロント未対応）
   - hookType, angleCombination（フロント未表示）

## 🚨 API複雑性の根本原因（2025/01/19判明）

1. **問題の規模**
   - 117個のAPIエンドポイント（本来15個で十分）
   - 同じ機能に7個の重複エンドポイント

2. **原因**
   - 認証エラーやDB接続エラーの「問題の先送り」
   - テストのたびに仮エンドポイントを作成して放置
   - `/api/test-*`、`/api/debug-*`、`/api/*-v2`の蓄積

3. **解決方針**
   - シンプルな`/api/v2/`構造（11個のみ）
   - 根本問題（認証・DB）を先に解決
   - テスト用エンドポイントは必ず削除

## 🚨 これだけは覚えて

1. **セッション開始時**
   - `cat ERRORS.md`で過去のエラーを確認
   - `cat MASTER_DOC.md`で現在の状態を確認
   - `cat CLAUDE.md`で詳細な手順を確認

2. **新機能開発時**
   - 新構造のAPIを使う：
     - コンテンツ生成: `/api/generation/*`
     - 情報収集: `/api/intelligence/*`
     - 自動化: `/api/automation/*`
   - `node scripts/dev-tools/api-dependency-scanner.js`で確認

3. **エラー発生時**
   - `node scripts/dev-tools/find-error.js "エラー内容"`で検索
   - 新しいエラーは`node scripts/dev-tools/error-recorder.js`で記録
   - モックで逃げない、根本解決

4. **ドキュメントで迷ったら**
   - このファイル（MASTER_DOC.md）を見る
   - 79個のドキュメントは基本的に無視してOK
   - 必要なら`node scripts/dev-tools/doc-finder.js`で検索

---

これ以外のドキュメントは基本的に見なくてOK。
必要になったら`doc-finder.js`で検索。