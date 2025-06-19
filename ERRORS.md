# よくあるエラーと解決策

このファイルには、繰り返し発生するエラーとその解決策を記録します。
**同じエラーで時間を無駄にしないために、必ず確認してください。**

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


## 🔴 DB問題解決

### 解決策
Prismaを最新版（v6.10.1）にアップデートすることでDB接続問題を解決。ViralDraftV2: 39件、ViralSession: 40件確認。npm install @prisma/client@latest prisma@latest && npx prisma generateで解決

*詳細は後で追記*

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

*最終更新: 2025/06/19*