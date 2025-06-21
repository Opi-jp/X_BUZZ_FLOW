# よくあるエラーと解決策

このファイルには、繰り返し発生するエラーとその解決策を記録します。
**同じエラーで時間を無駄にしないために、必ず確認してください。**

## 🚀 新しいエラー記録システム

### スマートエラー記録（推奨）
```bash
# エラーを記録（非対話的）
node scripts/dev-tools/smart-error-recorder.js [タイトル] [メッセージ] [解決策] [原因]

# 例
node scripts/dev-tools/smart-error-recorder.js "API 404エラー" "collect APIが見つからない" "パスを修正" "古いAPIパスを使用"

# 未解決エラーの確認
node scripts/dev-tools/smart-error-recorder.js --unresolved

# システム状態の確認
node scripts/dev-tools/smart-error-recorder.js --check-status
```

### 自動エラーキャプチャ
```bash
# 開発中のエラーを自動記録（永続サーバーと一緒に起動推奨）
node scripts/dev-tools/auto-error-capture.js

# キャプチャしたエラーのサマリー表示
node scripts/dev-tools/auto-error-capture.js --summary
```

**メリット**:
- 「詳細は後で追記」を防ぐ
- コンテキスト情報（Git状態、関連ファイル等）を自動収集
- エラーパターンの自動分類
- 未解決エラーのリマインダー機能

---

## 🔴 DB接続エラー

### 症状
- `Error: Can't reach database server`
- `Invalid prisma.user invocation`
- `The column users.createdAt does not exist`

### 原因
1. DIRECT_URLとDATABASE_URLの設定ミス
2. Prismaスキーマと実際のDBの不一致
3. マイグレーション未実行

### 解決策
```bash
# 1. 環境変数を確認
node scripts/dev-tools/check-env.js

# 2. DBスキーマを検証
node scripts/dev-tools/db-schema-validator.js

# 3. 正しい設定例（.env.local）
DATABASE_URL="postgresql://user:pass@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host:5432/postgres"
```

### 根本対策
- ❌ モックデータで回避しない
- ❌ 手動でカラムを追加しない
- ✅ Prismaマイグレーションを使用する

---

## 🔴 プロンプトが期待通りに動かない

### 症状
- GPTが「方向性」ではなく「実際の投稿文」を生成する
- 同じような出力ばかりになる
- JSONパースエラー

### 原因
1. 指示をJSONで細かく決めすぎている
2. 「物語性のある」などの修飾語を削除した
3. プロンプトを勝手に省略・追加した

### 解決策
```javascript
// ❌ 悪い例
const prompt = {
  task: "generate",
  format: "json",
  fields: ["hook", "angle"]
}

// ✅ 良い例
const prompt = `
あなたはバズるコンテンツ戦略家です。
物語性のある魅力的な投稿を作成してください。

出力は以下のJSON形式でお願いします：
{ "hook": "...", "angle": "..." }
`
```

### 根本対策
- 自然文で指示、出力形式のみJSON指定
- オリジナルプロンプトから勝手に変更しない
- `/docs/core/chain-of-thought-specification.md`を必ず参照

---

## 🔴 APIエンドポイントの混乱

### 症状
- どのAPIを使えばいいか分からない
- 同じ機能で複数のAPIが存在
- 新しいAPIを作ったのに古いAPIが使われる

### 原因
1. 命名規則が統一されていない
2. 移行計画が不明確
3. フロントエンドが古いAPIを使い続けている

### 解決策
```bash
# 1. 現在の使用状況を確認
node scripts/dev-tools/api-dependency-scanner.js

# 2. メインで使用中のAPI（CLAUDE.md参照）
セッション: /api/viral/v2/sessions/[id]    # 41箇所で使用
下書き:     /api/viral/v2/drafts/[id]      # メイン
```

### 根本対策
- 新機能実装時は既存APIを確認
- `/docs/api-contracts.md`で仕様管理
- フロントに合わせてAPIを退化させない

---

## 🔴 非同期処理のタイムアウト

### 症状
- continue-asyncが502エラー
- 処理が途中で止まる
- Phase間でコンテキストが失われる

### 原因
1. Vercelの実行時間制限（300秒）
2. 同期的な処理で待機している
3. エラー時のリトライがない

### 解決策
```javascript
// バックグラウンド処理に変更
setTimeout(async () => {
  await processAsync();
}, 0);

return NextResponse.json({ status: 'processing' });
```

### 根本対策
- 非同期ワーカーを使用
- 状態をDBに保存してレジューム可能に

---

## 🔴 Twitter認証エラー

### 症状
- Access Denied
- Bad Authentication data

### 原因
1. ポート3000以外で実行している
2. 環境変数の設定ミス
3. Twitter Developer Portalの設定

### 解決策
```bash
# 必ずポート3000で実行
./scripts/dev-persistent.sh

# Callback URL確認
http://localhost:3000/api/auth/callback/twitter
```

### 根本対策
- NEXTAUTH_URL=http://localhost:3000 固定
- ポート3000必須をCLAUDE.mdに明記済み

---

## 🔴 Node.jsプロセスの古いコード実行

### 症状
- ファイルを修正したのに反映されない
- モックデータが返され続ける
- 古い動作が続く

### 原因
- Node.jsプロセスがファイル変更後も古いコードを実行

### 解決策
```bash
# プロセスを再起動
npm run dev
# または永続サーバーを再起動
./scripts/dev-persistent.sh
```

### 根本対策
- コード変更後は必ずプロセス再起動
- ファイルの更新時刻を確認

---

## 🔴 Prismaクライアントエラー

### 症状
- `Cannot find module '@prisma/client'`
- `Cannot find module './lib/generated/prisma'`
- `PrismaClient is not a constructor`

### 原因
1. `npx prisma generate`を実行していない
2. スキーマ変更後に再生成していない
3. インポートパスが間違っている

### 解決策
```bash
# 1. Prismaクライアントを生成
npx prisma generate

# 2. 正しいインポート（プロジェクトの設定による）
// ❌ 間違い
import { PrismaClient } from '@prisma/client'

// ✅ このプロジェクトの正しいインポート
import { PrismaClient } from '../lib/generated/prisma'
// または
import { PrismaClient } from '@/lib/generated/prisma'
```

### 根本対策
- package.jsonのpostinstallスクリプトを確認
```json
"scripts": {
  "postinstall": "prisma generate"
}
```
- スキーマ変更時は必ず`npx prisma generate`

---


## 🔴 Twitter icon deprecated

### 解決策
lucide-reactのTwitterアイコンが非推奨。Xアイコンに変更するか、独自のSVGアイコンを使用する

*詳細は後で追記*

---


## 🔴 Perplexity API completions undefined

### 解決策
PerplexityClientを使うように修正済み。perplexity-sdkではなく/lib/perplexityのカスタムクライアントを使用

*詳細は後で追記*

---


## 🔴 Invalid JSON in response

### 解決策
Perplexity APIのレスポンスにエスケープされていない制御文字が含まれている可能性。JSONパース前にサニタイズが必要

*詳細は後で追記*

---


## 🔴 Invalid JSON Unexpected non-whitespace

### 解決策
Perplexity APIのレスポンスにJSONの後に余分な文字が含まれている。JSONブロックの終わりを正しく検出する必要がある

*詳細は後で追記*

---


## 🔴 Next.js webpack runtime error - Cannot find module './4243.js'

### 解決策
ページパスが存在しない場合に発生。実際のディレクトリ構造を確認して正しいパスにアクセスする必要がある

*詳細は後で追記*

---


## 🔴 Next.js 500エラー - 静的ファイルのMIMEタイプエラー

### 解決策
サーバーで500エラーが発生し、CSS・JSファイルがHTMLとして配信されている。サーバーログを確認する必要がある

*詳細は後で追記*

---


## 🔴 Perplexity topics JSONパースエラー

### 解決策
topicsフィールドがMarkdown形式で保存されているが、APIはパース済みJSONを期待している。Perplexityからの生データ形式とAPIの期待値が一致していない。

*詳細は後で追記*

---


## 🔴 loadPrompt import エラー

### 解決策
@/lib/prompts が存在しない。正しくは lib/prompt-loader.ts から loadPrompt をインポートする必要がある

*詳細は後で追記*

---


## 🔴 Perplexity topics パーサー実装

### 解決策
Perplexityのレスポンスが Markdown形式で返されるが、APIはJSON配列を期待していた。専用のパーサークラス PerplexityResponseParser を実装して解決

*詳細は後で追記*

---


## 🔴 パーサーのインポートエラー

### 解決策
TypeScriptパーサーをAPIから使用する際、ビルドが必要。また、実際のPerplexityレスポンスにはJSON末尾に参照番号[1]が含まれることがある

*詳細は後で追記*

---


## 🔴 Perplexity JSON内の改行文字エラー

### 解決策
PerplexityのレスポンスのJSONに含まれる改行文字が原因でJSONパースが失敗。summaryフィールド内に改行が含まれている

*詳細は後で追記*

---


## 🔴 middleware.tsリダイレクト問題

### 解決策

/api/twitter/postが/api/publish/post/nowにリダイレクトされて401 Unauthorizedエラーが発生。
解決策: middleware.tsで該当行をコメントアウトして一時的に無効化。
将来的には新しいAPIへの完全移行が必要。

*詳細は後で追記*

---


## 🔴 Prismaインポートパス問題

### 解決策

dev-toolsで'../../lib/prisma'が見つからないエラー。
原因: 正しいパスは'../../lib/generated/prisma'。
解決策: 全てのdev-toolsのrequire文を修正。

*詳細は後で追記*

---


## 🔴 APIテストでの401 Unauthorized

### 解決策

原因: test-api-flow-20250119.jsが新しいAPIエンドポイント(/api/create/flow/start)を使用していた。
このエンドポイントはrequireAuth()で認証が必要。
解決策: 既存の認証不要のAPI(/api/generation/content/sessions)を使用する。

*詳細は後で追記*

---


## 🔴 Perplexity JSONパースエラー

### 解決策

エラー: 'Unexpected token #, ### トピック1:... is not valid JSON'
原因: PerplexityがMarkdown形式で応答を返すが、JSON.parseで直接パースしようとした。
解決策: PerplexityResponseParserクラスを使用してMarkdownからJSONを抽出する。
実装済み: lib/parsers/perplexity-response-parser.ts

*詳細は後で追記*

---


## 🔴 認証設計の整理

### 解決策

結論: 認証はTwitter投稿時のみ必要。
- コンテンツ生成API: 認証不要（/api/generation/content/*）
- Twitter投稿API: 認証必要（環境変数のTwitter API認証情報を使用）
- 新しいAPIモジュール: requireAuth()を使用しているため要注意

*詳細は後で追記*

---


## 🔴 フロントエンドでPerplexity JSONパースエラー

### 解決策

エラー: 'Unexpected token #, ### トピック1:... is not valid JSON'
原因: フロントエンドでPerplexityのMarkdownレスポンスを直接JSON.parseしようとした。
解決策: 
1. バックエンドでパースを行い、フロントエンドでは生データを保持
2. 表示用の簡易データを作成
3. 実際のパースはgenerate-concepts APIで行われる

*詳細は後で追記*

---


## 🔴 DebuggerInjectorエラー

### 解決策

警告: 'Debugger server not found. Run: node scripts/dev-tools/frontend-debugger-ai.js'
原因: フロントエンドデバッガーサーバーが起動していない。
解決策: 
1. 開発時は無視しても問題ない
2. デバッグが必要な場合は: node scripts/dev-tools/unified-frontend-debugger.js
3. または環境変数でデバッガーを無効化

*詳細は後で追記*

---


## 🔴 POST /api/flow 500エラー

### 解決策
Prismaクライアントバージョンの問題。サーバーログに詳細が表示されない。tmuxのnextウィンドウでログ確認必要

*詳細は後で追記*

---


## 🔴 DBスキーマと実装の不一致

### 解決策
selectedConcepts→selectedIds、claudeData→contents、errorMessage削除、ViralDraft→ViralDraftV2

*詳細は後で追記*

---


## 🔴 GPTコンセプト生成エラー

### 解決策
Failed to parse topics data: No valid topics found in response - topicsデータの形式が期待と異なる

*詳細は後で追記*

---


## 🔴 Perplexity→GPTデータ変換エラー

### 解決策
topicsデータが存在するがGPTでパースエラー。PerplexityResponseParserが正しく動作していない可能性

*詳細は後で追記*

---


## 🔴 DB push timeout

### 解決策
DATABASE_URLは接続可能だがnpx prisma db pushでタイムアウト。directUrlの設定に問題がある可能性。pooler経由のDBアクセスでスキーマ更新が困難

*詳細は後で追記*

---


## 🔴 DB問題解決 - Prismaアップデートで解決

### 症状
- DB接続エラーが頻発
- マイグレーションタイムアウト（120秒）
- Prismaクライアントの型エラー

### 原因
古いバージョンのPrismaを使用していた（具体的なバージョンは不明）

### 解決策
Prismaを最新版（v6.10.1）にアップデート：
```bash
npm install @prisma/client@latest prisma@latest
npx prisma generate
```

### 結果
- DB接続問題が解決
- ViralDraftV2: 39件、ViralSession: 40件のデータを確認
- マイグレーションタイムアウトも改善

### 根本対策
- 定期的にPrismaのバージョンを更新
- package.jsonでバージョンを固定せず、適切な範囲指定を使用

---


## 🔴 Claude生成API修正

### 解決策
プロンプトローダーを使用してハードコードを排除。キャラクター別プロンプト（-simple.txt）とプロンプトエディターのバージョン管理に対応

*詳細は後で追記*

---


## 🔴 GPTからClaudeデータ変換修正

### 解決策
フロントエンドから送られるselectedConceptsオブジェクト配列とAPI側で期待するselectedIds文字列配列のミスマッチを修正。conceptId抽出処理を追加

*詳細は後で追記*

---


## 🔴 下書き→投稿フロー完全対応

### 解決策
全API・フロントエンドをViralDraftV2に移行完了。下書き一覧・編集・削除・投稿機能の完全実装。ステータス（DRAFT/POSTED）とハッシュタグ配列に対応

*詳細は後で追記*

---


## 🔴 Perplexity JSON parse error

### 解決策
PerplexityのJSONレスポンスが途中で切れていることがある。URLに...が含まれる場合は不完全なJSONを修復する処理を追加した。

*詳細は後で追記*

---


## 🔴 Claude generation Failed to generate any posts

### 解決策
プロンプトローダー、キャラクターファイル、プロンプトファイルすべて正常に存在するが、Claude APIが500エラーを返す。詳細ログを追加して原因調査中。

*詳細は後で追記*

---


## 🔴 Create部分の実装計画実行中に落ちました

### 症状
- Create部分の実装計画を実行中にシステムがクラッシュ
- 具体的なエラーメッセージは不明

### 考えられる原因
Based on common create-related errors in the system:
1. **Prismaクライアントエラー** - 最新版v6.10.1へのアップデートで解決済みだが、再発の可能性
2. **非同期処理のタイムアウト** - Vercelの300秒制限やフェーズ間でのコンテキスト消失
3. **APIエンドポイントの混乱** - 新旧API混在による予期しない動作
4. **Node.jsプロセスの古いコード実行** - ファイル変更が反映されていない
5. **DB接続エラー** - DIRECT_URLとDATABASE_URLの設定ミス

### 調査結果
- 現在動作中のプロセス: next-server (v15.3.0), npm run dev
- tmuxセッション(xbuzz:next)にエラーログなし
- Create関連ファイル:
  - `/app/api/create/flow/*` - 新APIモジュール
  - `/app/create/*` - フロントエンドページ
  - 多数のテストスクリプト存在

### 解決策
1. サーバープロセスの再起動:
   ```bash
   # tmuxセッションで再起動
   tmux attach -t xbuzz
   # Ctrl+C でサーバー停止後
   npm run dev
   ```

2. 環境確認:
   ```bash
   node scripts/dev-tools/check-env.js
   node scripts/dev-tools/db-schema-validator.js
   ```

3. APIエンドポイントの確認:
   ```bash
   node scripts/dev-tools/api-dependency-scanner.js
   ```

### 根本対策
- エラー発生時は必ずtmuxセッションのログを確認
- 実装前に環境のヘルスチェックを実行
- API変更時は依存関係スキャナーで影響範囲を確認

*詳細は後で追記*

---


## 🔴 E2E Test Status undefined error

### 解決策
E2Eテストでステータスがundefinedを返す問題。実際には全フェーズ完了しているが、status取得時にundefinedが返される。APIレスポンスの形式確認が必要。

*詳細は後で追記*

---


## 🔴 E2E Test drafts.filter error

### 解決策
E2Eテストの最後でdrafts.filterがundefinedに対して実行されるエラー。3つの下書きは正常に作成されているが、最終的な下書き取得時にundefinedが返される。APIレスポンス形式の確認が必要。

*詳細は後で追記*

---


## 🔴 DB Schema Validator接続エラー

### 症状
db-schema-validator実行時に "Can't reach database server at db.atyvtqorzthnszyulquu.supabase.co:5432" エラー発生

### 原因
dev-tools/db-schema-validator.jsが直接DB接続を試行しているが、DIRECT_URLがpooler経由の接続をサポートしていない

### 解決策
1. db-schema-validator.jsを修正して、`@/lib/prisma`のクライアントを使用
2. または、Next.js API経由でスキーマ検証を実行

### 根本対策
- 開発ツールもすべて統一されたPrismaクライアント（`@/lib/prisma`）を使用
- 直接DB接続は避け、Prismaクライアント経由でアクセス

---


## 🔴 2つのPrisma接続方法混在

### 解決策
db-schema-validator.jsはで直接DB接続を試行。一方、health APIは（CONNECTION_POOL経由）を使用。DIRECT_URLはpooler未対応のため接続失敗。解決策：db-schema-validator.jsも@/lib/prismaを使用するか、Next.js API経由でスキーマ検証を実行する。

*詳細は後で追記*

---


## 🔴 package.json整合性問題

### 解決策
engines指定でNode.js 18.xだが実際は24.1.0で動作中。package.jsonのenginesを'>=18.0.0'に更新すべき。onKeyPressも非推奨警告あり。

*詳細は後で追記*

---


## 🔴 database high - 重複エントリ削除

### 症状
Database schema validation issues detectedが多数重複して記録されていた

### 原因
自動エラー記録ツールが同じエラーを重複して記録していた

### 解決策
重複エントリを削除し、1つにまとめた。根本的にはdb-schema-validator.jsが正しく動作していない問題（後述）

### 根本対策
- エラー記録時の重複チェック機能の実装
- db-schema-validator.jsの修正

---


## 🔴 Prisma Client Error

### 解決策
Invalid STUDIO_EMBED_BUILD invocation in prisma/build/index.js - Prisma Studio起動時にハッシュ生成エラー

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 API 500 Error

### 解決策
GET /api/flow/[id] returning 500 status - session flow API failure with 780ms response time

*詳細は後で追記*

---


## 🔴 Next.js Build Error

### 解決策
ENOENT: no such file or directory, open '/Users/yukio/X_BUZZ_FLOW/.next/server/app/api/flow/[id]/route.js' - Next.jsビルドファイルが存在しない

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: Request failed with status code 404

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: Request failed with status code 404

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: Request failed with status code 404

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: Request failed with status code 404

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: Request failed with status code 404

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: Request failed with status code 404

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: Request failed with status code 404

*詳細は後で追記*

---


## 🔴 古いNext.jsプロセス問題解決

### 解決策
古いNext.jsプロセス（PID 28574,28568,28555）が残存してポート競合。kill -9で強制終了後、tmuxで再起動して正常復旧

*詳細は後で追記*

---


## 🔴 CLIエラー高速化成功

### 解決策
Claude-dev環境＋即座エラー検出システムにより、エラー発見→修正サイクルが大幅高速化。500エラー（古いNext.jsプロセス問題）を3分で特定・解決

*詳細は後で追記*

---


## 🔴 関数マッピング分析完了

### 解決策
統一関数マッピングツール実行完了。7個の問題検出(Critical:3, Warning:4)。主要問題: DB接続統一、型定義分散、APIレスポンス形式不一致。実際のコードではtheme/textパラメータは正しく実装済み

*詳細は後で追記*

---


## 🔴 lib/utils.ts不足エラー

### 解決策
Module build failed: No such file or directory lib/utils.ts - Next.jsビルドエラー。共通ユーティリティファイルが不足している

*詳細は後で追記*

---


## 🔴 統合システム復旧課題

### 解決策
lib/utils.ts, lib/prisma.ts, lib/core/claude-logger.ts等の基本ファイルが不足。統合システム実装時にファイルの依存関係を完全に設定する必要

*詳細は後で追記*

---


## 🔴 統合Publishシステム認証問題

### 解決策
Twitter API認証は正常動作。即時投稿は成功（URL: https://twitter.com/user/status/1935894360874537235）。スケジュール投稿はPrismaスキーマの scheduledTime フィールド名不一致で修正済み。統合フローは完全動作確認済み。

*詳細は後で追記*

---


## 🔴 ビルドエラー: モジュールが見つからない

### 解決策
dashboard-old/page.tsxとmorning/page.tsxで@/lib/date-utilsが見つからない。auth関連で@/lib/auth-optionsが見つからない。開発サーバーでは動作するがプロダクションビルドが失敗する。

*詳細は後で追記*

---


## 🔴 CSS読み込み問題

### 解決策
ブラウザでCSSが適用されない。サーバーはCSSファイルを正しく配信しているが、ブラウザ側でスタイルが反映されない。Tailwind CSS v3とv4の混在が原因の可能性。

*詳細は後で追記*

---


## 🔴 date-fns-tz import error

### 解決策
date-fns-tzからutcToZonedTimeとzonedTimeToUtcがインポートできない。正しい関数名はtoZonedTimeの可能性

*詳細は後で追記*

---


## 🔴 ビルドとファイル整理の状況

### 解決策
1. date-fns-tzのインポートエラーを修正（utcToZonedTime→toZonedTime）
2. 多くのファイルが[/ディレクトリに散在していたため、適切なlibディレクトリに移動
3. APIユーティリティ関数（successResponse、errorResponse等）を追加
4. PostTypeをprisma.tsからエクスポート
5. Prismaクライアントの型エラーを回避
6. ビルドは成功するが、多くの警告が残っている状態

*詳細は後で追記*

---


## 🔴 api_tasks.task_type missing - 解決済み

### 症状
"api_tasks.task_type does not exist" エラーが発生

### 原因
当初、Prismaスキーマにapi_tasksモデルが定義されていないと思われたが、実際には定義されていた（schema.prisma line 236）

### 解決策
1. Prismaクライアントを再生成: `npx prisma generate`
2. 実際にはフィールド名が`taskType`で、DBカラム名が`task_type`（@map使用）

### 根本対策
- エラーが発生した際は、まずPrismaスキーマを確認
- `npx prisma generate`を実行してクライアントを最新化
- このエラーは現在は発生していない（解決済み）

---


## 🔴 マイグレーション適用エラー

### 解決策
Gender型とnews_articles_url_keyインデックスが既に存在するため、マイグレーションが失敗。過去に手動でテーブルを作成したか、db-manager.jsで作成した可能性が高い。prisma migrate resolve --appliedで既適用としてマークすることで解決。

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 Prisma フィールド名エラー

**カテゴリ**: Database | **タグ**: prisma, db
**記録日時**: 2025/6/21 2:09:31


### 症状
```
PrismaのモデルでcamelCase（createdAt、selectedIds）を使用していたが、実際のDBカラムはsnake_case（created_at、selected_ids）だった。すべてのフィールド名をsnake_caseに統一することで解決。
```

### 再現手順


### 試した解決策


### 実際の解決策



### 根本原因



### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 テストエラー

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 2:23:21


### 症状
```
非対話的モードのテスト
```

### 再現手順


### 試した解決策


### 実際の解決策

正常に動作

### 根本原因

対話的モードを削除

### 再発防止策



---


## 🔴 Collect API 404エラー

**カテゴリ**: API | **タグ**: api, network
**記録日時**: 2025/6/21 2:23:30


### 症状
```
POST /api/generation/content/sessions/[id]/collect が404を返す
```

### 再現手順


### 試した解決策


### 実際の解決策

APIパスを正しく修正、または既存のAPIに統一

### 根本原因

古いAPIパスを使用していた可能性、またはAPIが実装されていない

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 Collect API パスエラー

**カテゴリ**: API | **タグ**: api, network
**記録日時**: 2025/6/21 2:32:47


### 症状
```
POST /api/generation/content/sessions/[id]/collectが404を返す。実際のパスは/api/create/flow/list/[id]/collectの可能性
```

### 再現手順


### 試した解決策


### 実際の解決策

APIパスを/api/create/flow/[id]/collectに修正

### 根本原因

processルートで間違ったAPIパスを使用

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 プロンプトファイル未実装エラー

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 2:35:22


### 症状
```
perplexity/collect-topics.txtが存在しない。PromptManager.loadが失敗
```

### 再現手順


### 試した解決策


### 実際の解決策

プロンプトファイルを作成するか、直接プロンプトを記述

### 根本原因

新しいAPIエンドポイントでプロンプトファイルが未実装

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 PerplexityResponseParser実装完了

**カテゴリ**: Module | **タグ**: import, dependency
**記録日時**: 2025/6/21 4:04:18


### 症状
```
Module not found: Can't resolve '@/lib/parsers/perplexity-parser'
```

### 再現手順


### 試した解決策


### 実際の解決策

PerplexityResponseParserクラスを実装

### 根本原因

モジュールが存在しなかった

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 パーサー混在問題

**カテゴリ**: API | **タグ**: api, network
**記録日時**: 2025/6/21 4:07:21


### 症状
```
GPT APIで旧/新パーサーが混在
```

### 再現手順


### 試した解決策


### 実際の解決策

統一パーサーに修正必要

### 根本原因

実装統合時の不一致

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 プロンプトファイル実装完了

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 4:10:43


### 症状
```
perplexity/collect-topics.txt と gpt/generate-concepts.txt を実装
```

### 再現手順


### 試した解決策


### 実際の解決策

PromptManagerでの読み込み成功

### 根本原因

Phase 2 API整合性修正完了

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 プロンプト確認完了

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 4:12:44


### 症状
```
既存プロンプトと整合性確認
```

### 再現手順


### 試した解決策


### 実際の解決策

PromptManagerによるバージョン管理システムが正常動作

### 根本原因

Phase 2 API整合性修正完了確認

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 Perplexityパーサーエラー

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 4:14:55


### 症状
```
Required topics array missing
```

### 再現手順


### 試した解決策


### 実際の解決策

フォールバック処理が動作、パーサー要修正

### 根本原因

Zodスキーマとレスポンス形式の不一致

### 再発防止策



---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 GPT APIビルドエラー

**カテゴリ**: Module | **タグ**: import, dependency
**記録日時**: 2025/6/21 4:15:20
**関連ファイル**: ./8548.js

### 症状
```
Cannot find module './8548.js'
```

### 再現手順


### 試した解決策


### 実際の解決策

Webpackモジュール解決失敗、サーバー再起動必要

### 根本原因

Phase 2修正後のビルド問題

### 再発防止策



---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api critical

### 解決策
Health check failed: Request failed with status code 500

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 api high

### 解決策
Health check failed: 

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 database high

### 解決策
Database schema validation issues detected

*詳細は後で追記*

---


## 🔴 Twitter API readWrite undefined

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 5:49:24


### 症状
```
Cannot read properties of undefined (reading 'update') - client.v2 is undefined
```

### 再現手順


### 試した解決策


### 実際の解決策

client.readWrite.v2.tweet()を使用

### 根本原因

Twitter APIクライアントの初期化方法が間違っていた

### 再発防止策



---


## 🔴 Twitter API update error

**カテゴリ**: Database | **タグ**: prisma, db
**記録日時**: 2025/6/21 6:05:29


### 症状
```
Cannot read properties of undefined (reading 'update') - 投稿は成功するがDBが更新されない
```

### 再現手順


### 試した解決策


### 実際の解決策

readWriteプロパティとDB更新のデバッグログを追加

### 根本原因

Twitter APIのレスポンス形式が想定と異なる可能性

### 再発防止策



---


## 🔴 DBManager transaction error

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 6:37:20


### 症状
```
Cannot read properties of undefined (reading 'update')
```

### 再現手順


### 試した解決策


### 実際の解決策

DBManagerではなく直接prismaを使用する

### 根本原因

DBManagerのトランザクション実装の型不整合

### 再発防止策



---


## 🔴 useSearchParams Suspenseエラー

**カテゴリ**: Other | **タグ**: uncategorized
**記録日時**: 2025/6/21 22:25:00
**関連ファイル**: Next.js

### 症状
```
Next.js 15でuseSearchParams()がSuspense境界を要求
```

### 再現手順


### 試した解決策


### 実際の解決策

SuspenseでラップしたコンポーネントにuseSearchParamsを移動

### 根本原因

Next.js 15のSSR/CSR bailout仕様変更

### 再発防止策



---


## 🔴 APIルート構造の混乱

**カテゴリ**: API | **タグ**: api, network
**記録日時**: 2025/6/21 22:25:09


### 症状
```
リダイレクトファイル23個、重複API多数
```

### 再現手順


### 試した解決策


### 実際の解決策

統合計画に基づくディレクトリ整理とリダイレクト削除

### 根本原因

過去の移行作業の不完全さ

### 再発防止策



---

## 📝 エラー記録方法

新しいエラーが発生したら：

1. このファイルに追記
2. 形式：
   - 症状（具体的なエラーメッセージ）
   - 原因（なぜ起きたか）
   - 解決策（どう直したか）
   - 根本対策（再発防止策）

3. コミット
```bash
git add ERRORS.md
git commit -m "docs: [エラー名]の解決策を追加"
```

---

## 🔴 Next.jsサーバービルドエラー (2025/06/20)

### 症状
- `.nextディレクトリのビルドエラーでサーバーが正常起動していない`
- `ENOENT: no such file or directory, open '/Users/yukio/X_BUZZ_FLOW/.next/server/app/api/flow/[id]/route.js'`

### 原因
- .nextディレクトリのビルドキャッシュが壊れている
- ファイル変更後の不完全なビルド

### 解決策
```bash
# .nextディレクトリを削除して再ビルド
rm -rf .next
npm run build
npm run dev
```

### 根本対策
- 大きなファイル変更後は必ず.nextを削除して再ビルド
- ビルドエラーが出たらログを確認してから対処

---

## 🔴 DBスキーマとDBの大きな不一致 (2025/06/20)

### 症状
- 37個のエラー: スキーマに定義されているがDBに存在しないテーブル
- 127個の警告: DBに存在するがスキーマに定義されていないテーブル/カラム

### 原因
- 長期間の開発でDBとスキーマが乖離
- 手動でのテーブル作成や削除
- マイグレーション履歴の不整合

### 解決策
```bash
# 現在のDBからスキーマを取得
npx prisma db pull

# 差分を確認してから
npx prisma generate
```

### 根本対策
- 定期的にDBとスキーマの同期を確認
- 手動でのDB操作は避ける
- マイグレーションは必ずPrisma経由で実行

---

## 🔴 実装での誤ったモデル参照 (2025/06/20)

### 症状
- `prisma.aiPattern` - コメントアウトされたコードで参照
- `prisma.post` - 存在しないモデル（おそらくscheduledPostの誤り）
- `prisma.client` - Prisma内部で生成される参照

### 原因
- 古いコードの残存
- モデル名の変更後の修正漏れ
- コメントアウトされたコードの放置

### 解決策
- `app/api/generate/route.ts`のコメントアウトされたaiPattern参照を削除
- `lib/smart-rt-scheduler.ts`の誤ったpost参照を修正
- 不要なコメントアウトコードを削除

### 根本対策
- コメントアウトされたコードは定期的に削除
- モデル名変更時は全体検索で影響範囲を確認
- TypeScriptの型チェックを活用

---

## 🔴 古いテーブルの残存 (2025/06/20)

### 症状
- `viral_posts` - 旧システムのテーブル（現在はviral_drafts_v2を使用）
- その他多数の未使用テーブル

### 原因
- システム移行時の旧テーブル削除忘れ
- 開発中の実験的テーブルの放置

### 解決策
- 未使用テーブルのリストアップ
- バックアップ後に削除
- スキーマファイルから削除

### 根本対策
- 定期的なDB棚卸し
- 移行完了後は旧テーブルを速やかに削除
- テーブル作成時は用途をコメントで記載

---

*最終更新: 2025/06/20*

## 🚀 Claude専用フロントエンド改善システム（2025年6月20日実装）

### 解決した主要課題
1. **F12コピペ問題**: claude-instant-error-detector.jsでリアルタイム検出
2. **セッション中断問題**: session-manager.tsで状態自動復元
3. **関数定義不一致**: unified-function-mapper.jsで自動検証
4. **構造化ログ不足**: claude-logger.tsでClaude読みやすい形式

### 実装ファイル（修復完了）
- ✅ `/lib/core/claude-logger.ts` - 統一ログシステム
- ✅ `/lib/utils.ts` - 共通ユーティリティ関数
- ✅ `/lib/prisma.ts` - DB接続統一管理
- ✅ `/types/frontend.ts` - フロントエンド型定義
- ✅ `/lib/shared/api-contracts.ts` - API契約システム
- ✅ `/lib/frontend/session-manager.ts` - セッション管理

### 開発ツール（新規実装）
- ✅ `./scripts/dev-persistent-enhanced.sh` - Claude-dev統合環境
- ✅ `scripts/dev-tools/claude-instant-error-detector.js` - 即座エラー検出
- ✅ `scripts/dev-tools/unified-monitoring-dashboard.js` - 統合監視
- ✅ `scripts/dev-tools/frontend-flow-tester.js` - 自動UIテスト
- ✅ `scripts/dev-tools/unified-function-mapper.js` - 関数整合性検証

### 開発効率の改善
- **エラー検出時間**: F12コピペ→即座自動検出（約10倍高速化）
- **セッション継続**: 中断からの復帰が完全自動化
- **型安全性**: フロントエンド・バックエンド間のエラー大幅削減
- **ログ可視性**: Claude（AI）が状況を即座に把握可能

---

## 📝 エラー記録方法（改善版）

### 従来の問題
- 「詳細は後で追記」のまま放置される
- エラー発生時のコンテキストが失われる
- 同じエラーを何度も繰り返す

### 新しい記録方法

#### 1. スマートエラー記録（手動記録時）
```bash
# 詳細情報を対話的に記録
node scripts/dev-tools/smart-error-recorder.js

# 特徴：
# - Git状態、ブランチ、最近のコミットを自動記録
# - エラーパターンを自動分類（DB/TypeScript/Build等）
# - 関連ファイルを自動検出
# - 未解決エラーはリマインダー登録
```

#### 2. 自動エラーキャプチャ（開発中）
```bash
# dev-persistent-enhanced.shに追加予定
node scripts/dev-tools/auto-error-capture.js

# 特徴：
# - エラー発生時に自動的に詳細を記録
# - スタックトレースを保存
# - デスクトップ通知
# - エラーサマリーレポート
```

#### 3. 記録される情報
- **基本情報**: タイトル、エラーメッセージ、発生日時
- **コンテキスト**: Gitブランチ、変更ファイル、Node.jsバージョン
- **分類**: カテゴリ（DB/Build/TypeScript等）、タグ
- **詳細**: 再現手順、試した解決策、実際の解決策、根本原因
- **関連**: 関連ファイル、スクリーンショット、スタックトレース

#### 4. エラー管理
```bash
# 未解決エラーの確認
node scripts/dev-tools/smart-error-recorder.js --unresolved

# エラーサマリーの表示
node scripts/dev-tools/auto-error-capture.js --summary

# エラー詳細の保存場所
.error-details/         # 詳細JSON
.error-capture/         # 自動キャプチャ
```

### ベストプラクティス
1. **即座に記録**: エラー発生時にすぐ記録（記憶が新鮮なうちに）
2. **詳細を省略しない**: 「後で」は来ない
3. **解決策を必ず記録**: 未解決でも「試したこと」を記録
4. **定期的な見直し**: 未解決エラーを週1で確認