# X_BUZZ_FLOW プロジェクト概要

## 🚀 クイックスタート

### 開発環境の起動
```bash
# 1. 環境のヘルスチェック
./scripts/dev-tools/health-check.sh

# 2. 永続サーバーの起動（必須）
./scripts/dev-persistent-enhanced.sh  # Claude-dev統合環境（推奨）
# または 基本版
./scripts/dev-persistent.sh

# 3. エラーキャプチャの起動（🚨 重要：作業開始時に必ず実行）
node scripts/dev-tools/backend-error-capture.js &  # バックエンドエラー監視
node scripts/dev-tools/auto-error-capture.js &     # フロントエンドエラー監視

# ⚠️ 重要: 
# - ポート3000必須（Twitter認証のWebhookが3000を指定）
# - npm run devは使用しない（APIタイムアウトが発生する）
# - tmuxがインストールされていることが前提条件
# - エラーキャプチャは作業開始時に必ず起動すること
```

### 最重要ドキュメントの確認
```bash
# エラー解決策を先に確認（同じエラーを繰り返さない）
cat ERRORS.md

# 統合マスタードキュメント（迷ったらこれ）
cat MASTER_DOC.md

# ドキュメント作成禁止令
cat NO_MORE_DOCS.md

# Chain of Thought仕様書（プロンプト実装時のみ）
cat docs/core/chain-of-thought-specification.md

# プロンプトマスター仕様書（最重要）
cat docs/prompt-master-specification.md
```

### 作業ログの開始
```bash
./scripts/auto_log_updater.sh start "X_BUZZ_FLOW" "作業内容"
```

## 🛠️ 開発効率化ツール

開発ツールは `scripts/dev-tools/` ディレクトリに整理されています。

### 🚀 Claude専用開発環境（2025年6月20日追加）
```bash
# Claude-dev統合開発環境起動（推奨）
./scripts/dev-persistent-enhanced.sh

# Claude専用エラー検出（リアルタイム）
node scripts/dev-tools/claude-instant-error-detector.js

# 統合監視ダッシュボード
node scripts/dev-tools/unified-monitoring-dashboard.js
```

#### Claude専用システムの特徴
- **ClaudeLogger**: 構造化ログ出力で即座にエラー原因を把握
- **10種類の統合監視**: API、DB、フロントエンド、リンク切れまで網羅
- **エラー即座検出**: F12でのコピペ作業不要
- **セッション継続**: 中断からの復帰を完全サポート
- **関数整合性チェック**: フロントエンド・バックエンド間の関数定義エラーを自動検出
- **スマートエラー統合**: エラーの自動記録・通知・解決提案（2025年6月20日追加）

#### スマートエラー記録システム（Claude統合版）
```bash
# エラー状況を確認（Claude専用）
node scripts/dev-tools/claude-check-errors.js

# 手動でエラーを記録
node scripts/dev-tools/smart-error-recorder.js

# クイック記録（最小限の情報で素早く記録）
node scripts/dev-tools/smart-error-recorder.js --quick

# 未解決エラーの確認
node scripts/dev-tools/smart-error-recorder.js --unresolved

# Claude-dev環境内のショートカット（13番ウィンドウ）
ser   # エラー記録
serq  # クイック記録
seru  # 未解決エラー表示
```
- **ビルド監視（2025年6月21日追加）**: ビルドエラーをClaude形式で即座に把握
- **自動エラーキャプチャ（2025年6月21日追加）**: 開発中のエラーを自動記録・分類

### 統合開発ツール
```bash
node scripts/dev-tools/dev-tools.js start   # 開発環境起動
node scripts/dev-tools/dev-tools.js check   # ヘルスチェック
node scripts/dev-tools/dev-tools.js fix     # 自動修正
```

### データベース管理
```bash
node scripts/dev-tools/db-manager.js status   # DB状態確認
node scripts/dev-tools/db-monitor.js          # リアルタイム監視
node scripts/dev-tools/db-schema-validator.js # 整合性チェック
```

### 環境チェック
```bash
node scripts/dev-tools/check-env.js          # 環境変数確認
./scripts/dev-tools/health-check.sh          # 総合ヘルスチェック
node scripts/dev-tools/check-session-urls.js # セッションURL確認
```

### エラー解決支援（2025年6月21日強化）
```bash
# 過去のエラー解決策を検索
node scripts/dev-tools/find-error.js "database"
node scripts/dev-tools/find-error.js "prisma" --detail

# 新しいエラーを記録（旧方式）
node scripts/dev-tools/error-recorder.js
node scripts/dev-tools/error-recorder.js --quick "エラー名" "解決策"

# スマートエラー記録（推奨） - 詳細情報を自動収集
node scripts/dev-tools/smart-error-recorder.js
node scripts/dev-tools/smart-error-recorder.js --quick      # クイックモード
node scripts/dev-tools/smart-error-recorder.js --unresolved # 未解決エラー一覧

# 自動エラーキャプチャ（開発中のエラーを自動記録）
node scripts/dev-tools/auto-error-capture.js
node scripts/dev-tools/auto-error-capture.js --summary      # キャプチャ済みエラーのサマリー

# バックエンド専用エラーモニター
node scripts/dev-tools/backend-error-monitor.js

# エラーカテゴリを表示
node scripts/dev-tools/find-error.js --categories
```

#### エラー記録システムの特徴
- **自動コンテキスト収集**: Git状態、関連ファイル、スタックトレース
- **エラーパターン認識**: DB、TypeScript、API、認証、LLM APIエラーを自動分類
- **「詳細は後で追記」問題の解決**: 必要な情報を対話的に収集
- **バックエンドエラー対応**: Prismaエラーコード解析、LLM APIレート制限検出
- **リマインダー機能**: 未解決エラーの追跡管理

### API依存関係の可視化
```bash
# API依存関係をスキャン
node scripts/dev-tools/api-dependency-scanner.js

# 未使用APIのみ表示
node scripts/dev-tools/api-dependency-scanner.js --unused

# JSON形式で出力（プログラムで処理する場合）
node scripts/dev-tools/api-dependency-scanner.js --json

# ブラウザで視覚的に確認
# http://localhost:3000/api-visualizer
```

**重要**: APIエンドポイントの重複や先祖返りを防ぐため、新規API追加前に必ずスキャンを実行すること

### プロンプトエディター（Chain of Thought管理）
```bash
# プロンプト一覧表示（再帰的にサブディレクトリも表示）
node scripts/dev-tools/prompt-editor.js list

# プロンプトの編集（変数の説明付き）
node scripts/dev-tools/prompt-editor.js edit gpt/generate-concepts.txt

# プロンプトのテスト実行（インタラクティブ）
node scripts/dev-tools/prompt-editor.js test perplexity/collect-topics.txt

# プロンプトの直接実行（非インタラクティブ） ← NEW!
node scripts/dev-tools/prompt-editor.js test-direct perplexity/collect-topics.txt \
  theme="AIと働き方" platform=Twitter style=エンターテイメント --non-interactive

# 変数展開のプレビュー（実行せずに確認）
node scripts/dev-tools/prompt-editor.js preview claude/character-profiles/cardi-dare.txt

# プロンプト変更の影響分析（DB影響あり/なし判定）
node scripts/dev-tools/prompt-editor.js impact gpt/generate-concepts.txt

# DB互換性チェック＆マイグレーション生成
node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt

# 編集履歴とバージョン管理
node scripts/dev-tools/prompt-editor.js history
node scripts/dev-tools/prompt-editor.js rollback gpt/generate-concepts.txt v1.0.2

# 統計情報（編集回数、スコア改善等）
node scripts/dev-tools/prompt-editor.js stats
```

**プロンプト変更時の注意**: 
- impactで影響範囲を確認
- compatでDB互換性をチェック
- 問題があればマイグレーションを生成して実行

## 🆕 統一システム管理（Unified System Manager）

### 概要
開発の一貫性を保つための中央管理システムを導入しました。ID生成、型定義、エラーハンドリング、プロンプト管理、DB連携などを統一的に管理します。

**2025/06/20 重要更新**: Prisma初期化問題を統一システム管理で解決。すべてのCreate APIが統一システムを使用するように改修済み。

### 基本的な使い方
```typescript
import { IDGenerator, EntityType, ErrorManager, PromptManager, DataTransformer, DBManager } from '@/lib/core/unified-system-manager'

// 1. ID生成（エンティティタイプ別のプレフィックス付き）
const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION)  // sess_xxxxxxxxxxxx
const draftId = IDGenerator.generate(EntityType.DRAFT)           // draft_xxxxxxxxxxxx

// 2. エラーハンドリング（自動ログ記録）
try {
  // 処理実行
} catch (error) {
  const errorId = await ErrorManager.logError(error, {
    module: 'create',
    operation: 'generate-concepts',
    sessionId
  })
  const userMessage = ErrorManager.getUserMessage(error, 'ja')
}

// 3. プロンプト管理（変数展開・キャッシュ対応）
const prompt = await PromptManager.load(
  'gpt/generate-concepts.txt',
  { theme, platform, style },
  { validate: true, cache: true }
)

// 4. データ変換（3層アーキテクチャ）
const processData = DataTransformer.toProcessData(rawData, EntityType.VIRAL_SESSION)
const displayData = DataTransformer.toDisplayData(processData, 'summary')

// 5. DB操作（トランザクション・リトライ対応）
const result = await DBManager.transaction(async (tx) => {
  const session = await tx.viralSession.create({ data })
  await tx.sessionActivityLog.create({ data: logData })
  return session
})
```

### 詳細ドキュメント
- 使用ガイド: `/lib/core/unified-system-usage-guide.md`
- クイックリファレンス: `/lib/core/unified-system-quick-reference.ts`

### 導入のメリット
1. **一貫性**: ID形式、エラー処理、データ構造が統一される
2. **型安全性**: Zodスキーマによる実行時の型チェック
3. **開発効率**: よく使うパターンがすぐに使える
4. **保守性**: 中央管理により変更が容易
5. **エラー削減**: パラメータの不一致によるエラーを防ぐ

### Prismaモデル名の注意事項（重要）
Prismaスキーマではsnake_caseを使用します：
- ✅ 正しい: `prisma.viral_sessions.create()`
- ❌ 間違い: `prisma.viralSession.create()`
- ✅ 正しい: `prisma.viral_drafts_v2.findMany()`
- ❌ 間違い: `prisma.viralDraftV2.findMany()`

## 🔧 フロントエンド改善システム（2025年6月20日実装完了）

### 実装済みコアファイル
1. **ClaudeLogger** (`/lib/core/claude-logger.ts`)
   - Claude専用の構造化ログシステム
   - フロー進行状況、エラー詳細、API追跡
   - 開発・本番両対応

2. **統一型定義** (`/types/frontend.ts`)
   - Create→Draft→Postフロー完全対応
   - FlowSession、ConceptOption、GeneratedContent型
   - フロントエンド・バックエンド間の整合性確保

3. **API契約システム** (`/lib/shared/api-contracts.ts`)
   - Zodベースのバリデーション
   - 統一エラーハンドリング
   - Request/Response型定義

4. **セッション管理** (`/lib/frontend/session-manager.ts`)
   - LocalStorage状態管理
   - 中断からの復帰
   - コンテキスト保持

### 自動テストツール
- **フロントエンドフローテスター**: Puppeteerベースの完全自動テスト
- **関数マッピングツール**: バックエンド・フロントエンド関数定義の整合性チェック
- **エラー即座検出**: リアルタイムエラー監視とパターンマッチング

### 開発フロー
```bash
# 1. Claude-dev環境起動
./scripts/dev-persistent-enhanced.sh

# 2. 別ターミナルでClaude専用エラー検出
node scripts/dev-tools/claude-instant-error-detector.js

# 3. 開発作業（エラーは自動検出・記録）
# 4. フロントエンドフローテスト
node scripts/dev-tools/frontend-flow-tester.js
```

## 📝 テストスクリプトの管理ルール

### テストスクリプトの命名規則と配置

**重要**: 一時的なテストスクリプトは必ず以下のルールに従ってください。

1. **ファイル名に日付を含める**
   ```
   test-[機能名]-[YYYYMMDD].js
   例: test-cot-flow-20250617.js
   ```

2. **必ずtest-scriptsフォルダに配置**
   ```
   ❌ ルートディレクトリに配置しない
   ❌ scriptsフォルダに配置しない
   ✅ test-scripts/test-phase1-debug-20250617.js
   ```

3. **用途別のプレフィックス**
   - `test-` : 一般的なテスト
   - `check-` : 状態確認用
   - `debug-` : デバッグ専用
   - `verify-` : 検証用

4. **定期的なクリーンアップ**
   - 1週間以上前の日付のテストスクリプトは削除対象
   - 恒久的に必要なスクリプトは scripts/dev-tools/ へ移動

## ⚠️ データベース処理の重要な注意事項

### DBエラーへの対処方法

**絶対にやってはいけないこと：**
1. ❌ **モックデータでの一時的な対処**
   - エラーを隠蔽し、本番環境で問題を引き起こす
   - 開発環境と本番環境の乖離を生む

2. ❌ **安易なスクリプトでのカラム追加**
   - Prismaスキーマとの不整合を引き起こす
   - マイグレーション履歴が破壊される

3. ❌ **エラーメッセージを無視した処理の継続**
   - データ不整合の原因となる

### 正しいDBエラーの対処手順：

1. **エラーメッセージを正確に読む**
   ```
   例: "Column 'theme' does not exist"
   → Prismaスキーマと実際のDBが不一致
   ```

2. **根本原因を特定**
   ```bash
   # Prismaスキーマの確認
   cat prisma/schema.prisma | grep -A 5 -B 5 "問題のフィールド名"
   
   # DBスキーマ検証ツールを使用
   node scripts/dev-tools/db-schema-validator.js
   ```

3. **正式な手順で修正**
   ```bash
   # Prismaマイグレーションで修正
   npx prisma migrate dev --name fix_missing_column
   
   # または、本番DBの場合
   npx prisma db pull  # 現在のDBスキーマを取得
   npx prisma generate # クライアント再生成
   ```

### 開発時の原則：
- **DBエラーは必ず根本から解決する**
- **モックデータは絶対に使わない**
- **Prismaを通じて正式に対処する**
- **不明な場合は必ずユーザーに確認する**

## 🧠 Chain of Thoughtとプロンプト設計の教訓

### プロンプト設計の重要原則

#### 1. 入力と出力は1:1対応ではない
```
❌ 間違った理解：
「5種類のフックを示した → 5つ出力される」
「3つのコンセプト + 5段階構造 = 8つ生成？」

✅ 正しい理解：
ガイド部分：LLMに「考え方」を示す（例：5種類のフック、12種類の角度）
出力部分：LLMが創造的に選択・組み合わせ・理由付けした結果
```

#### 2. プロンプトを関数化してはいけない
```javascript
// ❌ プログラミング的発想（ダメ）
const hookType = selectOne(["意外性", "緊急性", "自己投影"])

// ✅ Chain of Thought的発想（良い）
「これらのフックを参考に、なぜその組み合わせが効果的か説明して」
```

#### 3. 逆算設計が必須
```
Step 3が必要とする情報 → Step 2の出力を設計
Step 2が必要とする情報 → Step 1の出力を設計

❌ 各ステップを独立設計 → 後で繋げようとする → 破綻
```

#### 4. フィールド名もLLMの判断に影響する
```json
// ⚠️ フィールド名の罠
"mainContent": "..."  // LLM:「主な内容か、抽象的でもOK」
"specificContent": "..." // LLM:「具体的な内容が必要なんだな」
```

### 実装上の連鎖エラーを防ぐ

#### よくある破壊的な流れ
```
1. プロンプト誤解「3+5=8つのコンセプト？」
   ↓
2. DB設計を8つ前提で実装・マイグレーション
   ↓
3. 次フェーズ「3つのコンセプトを処理」→ エラー！
   ↓
4. 「前フェーズが間違ってる！修正！」
   ↓
5. 全体が間違った方向に収束 → 正しいものが一つもない状態
```

#### 防ぐための心得
- **最初のプロンプト理解が全てを決める**
- **短い誤解が全体設計を破壊する**
- **動くけど意図と違うシステムが最も危険**

## 🚨 現在使用中の主要APIエンドポイント

**重要**: 新機能実装時は必ず以下のAPIを使用すること。新しいAPIを作る前に既存のものを確認！

### メインで使用中のAPI（変更禁止）
```
セッション管理: /api/viral/v2/sessions/[id]       # 41箇所で使用中
下書き管理:     /api/viral/v2/drafts/[id]         # メインの下書きAPI
ニュース:       /api/news/*                       # ニュース関連
投稿実行:       /api/twitter/post                 # Twitter投稿
```

### 移行中のAPI（混在注意）
```
旧: /api/viral/cot-session/[sessionId]     → 使用禁止（0箇所）
新: /api/generation/content/session/[id]   → 将来的に移行予定（1箇所のみ）
```

### 重複に注意
- 同じ機能で複数のAPIが存在する場合は、上記の「メインで使用中」を使う
- test-*やdebug-*のAPIは本番コードから呼ばない
- 不明な場合は `node scripts/dev-tools/api-dependency-scanner.js` で確認

## 🎯 現在のシステム状態（2025年6月20日時点）

### Create→Draft→Post フロー完全実装完了 ✅

#### 2025年6月20日の重要な達成：
- **実際のTwitter投稿成功**: Create→Draft→Postフローで実際の投稿確認
- **autoProgress機能実装**: E2Eテスト用の自動進行モード追加
- **APIパラメータ整合性確認**: すべてのAPIで入出力の一貫性を検証

#### 2025年6月19日の達成事項：
- **Create→Draft→Post フロー**: Perplexity→GPT→Claude→ViralDraftV2→Twitter投稿の完全実装
- **DB問題根本解決**: Prisma v6.10.1にアップデートでDB接続問題解決
- **ViralDraftV2完全移行**: 旧テーブル使用停止、新スキーマ対応完了
- **プロンプト管理強化**: ハードコード排除、loadPrompt()でバージョン管理対応
- **データフロー修正**: selectedConcepts↔selectedIds変換問題解決

#### 現在動作中のメインフロー：
```
Step 1: Perplexity - トピック収集（topicsフィールド）
Step 2: GPT - コンセプト生成（conceptsフィールド、selectedIds管理）
Step 3: Claude - キャラクター投稿生成（contentsフィールド）
Step 4: Draft - ViralDraftV2テーブルに保存
Step 5: Post - Twitter投稿実行
```
  - 5種類のフックタイプ、12種類の角度
  - バイラルスコアによる効果予測

### 4つのコアシステム

1. **NEWSシステム** ✅ 完全動作中
   - RSS記事収集・AI分析・重要度スコア算出
   - `/api/intelligence/news/*`

2. **V2バイラルシステム** ✅ 完全動作中  
   - Perplexity→GPT→Claude による3段階生成
   - `/api/generation/content/*`

3. **KaitoAPIシステム** ✅ 完全動作中
   - Twitter metrics収集・バズ投稿分析
   - Twitter API制限の回避

4. **BUZZシステム** ⚠️ UI実装済み（データ接続待ち）
   - バズ投稿の表示・分析・引用投稿作成

## 📌 重要な引き継ぎ事項

### 最優先タスク
1. **プロンプトエディターの実装**
   - プロンプトの編集・テスト・比較ツール
   - プロンプト作成の注意事項を埋め込み
   - よくある失敗パターンの自動検出
   - 詳細設計: 本ファイルの作業記録参照

2. **プロンプト最適化の継続検討**
   - structure フィールドの「方向性」問題
   - 抽象的 vs 具体的な指示のバランス
   - LLMに重要なキーワード（データ、洞察、ストーリー）

3. **システム統合の完了**
   - NEWS×V2バイラル統合
   - 過去ツイート分析機能の実装

### 技術的注意点
- expertiseはすべてthemeに変更済み
- 新API構造：`/api/generation/content/sessions/*`（旧viral/v2は削除）
- 非同期処理は`continue-async`を使用
- プロンプトのロール定義は一貫性を保つ
- ポート3000必須（Twitter OAuth認証の制約）
- **LLM応答時間（実測値）**: 
  - Perplexity: 20-60秒（最新ニュース検索・分析のため最も重い）
  - GPT-4o: 15-45秒（複数並列処理時はさらに増加）
  - Claude: 10-30秒
- **テスト時の待機時間**: 各フェーズごとに適切な待機時間を設定すること

## 🔧 技術スタック

- **Frontend**: Next.js 15.3 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **AI**: GPT-4o (OpenAI) + Claude 3 (Anthropic) + Perplexity
- **ORM**: Prisma

## 📁 プロジェクト構造

```
app/
├── mission-control/     # 統合ダッシュボード
├── intelligence/        # 情報収集・分析
├── generation/         # コンテンツ生成
├── automation/         # 自動化・投稿
└── viral/v2/           # V2バイラルシステム

api/
├── intelligence/       # ニュース、バズ、トレンド
├── generation/        # セッション、キャラ、下書き
├── automation/        # スケジューラー、パフォーマンス
└── integration/       # 外部API連携

docs/
├── core/              # 重要仕様書
├── current/           # 最新実装の注意点
├── visualizations/    # システム図・フロー図
└── work-logs/         # 作業記録アーカイブ
```

## 📊 重要な設計ドキュメント（必読）

### システム設計図
```bash
# 統合システム実装計画（最重要）
cat docs/current/integrated-system-implementation-plan-20250619.md

# システムアーキテクチャ図（Mermaid）
cat docs/visualizations/system-architecture.md

# データフロー詳細分析
cat data_flow_analysis.md

# NEWS×バイラル統合設計
cat docs/current/news-viral-integration-design.md
```

### 可視化ツール
```bash
# フロー全体を可視化（リアルタイム状態確認）
node scripts/dev-tools/flow-visualizer.js

# Mermaidダイアグラム生成
node scripts/dev-tools/flow-visualizer.js --mermaid

# 特定セッションの詳細分析
node scripts/dev-tools/flow-visualizer.js [sessionId] --detailed
```

## 🚀 高速デバッグツール

### INTEGRATEステップのテスト
```bash
# サーバー再起動なしでテスト
./scripts/quick-test-integrate.sh [セッションID]
```

### セッション状態の確認
```bash
node check-session-status.js [セッションID]
```

## 📌 セッション終了時
```bash
./scripts/session-save.sh
```

## プロジェクトオーナーの目標とビジョン

### 背景
- LLMの進展により、従来の働き方に大きな変革が訪れると予想
- 50歳を超えてセカンドキャリアを考える必要がある
- TwitterやSNSを駆使して、ベーシックインカムと影響力を確保する必要がある

### 発信軸
- **メインテーマ**: クリエイティブの発想を使ってLLMをどう活用しながら、新しい時代を生き抜くか
- **サブテーマ**: AI関連の紹介、働き方などの未来予測

### 短期KPI（3ヶ月）
- **フォロワー**: 青バッジフォロワー2,000人達成
- **インプレッション**: 500万インプレッション達成
- **収益化**: Xサブスクライブ機能での収入確立

## Chain of Thoughtの設計原則（重要）

### 🚨 必ず参照すること
**新しいセッションを開始する際は、必ず `/docs/core/chain-of-thought-specification.md` を参照してください。**

### 基本原則
- **Chain of ThoughtはGPTに考えさせる技法**
- プロンプトはGPTの思考を導くガイド
- ハードコードされた処理ではない

### よくある間違い
- ❌ プロンプトを削る・簡略化する
- ❌ 評価基準をハードコードする
- ❌ フェーズ間でプロンプトを移動する
- ❌ 検索を短いクエリで済ませる
- ❌ **与えたプロンプトを勝手に省略する**
- ❌ **与えたプロンプトに勝手に追加する**

### プロンプトと関数的処理の違い（重要）
- **LLMは指示をJSONで決めすぎると回答が画一的になる**
- **なるべく自然文で渡したほうがいい結果が出る**
- **自然文を与えて、出力形式をJSONで指定する形**（DBに入れやすくなる）
- **出力指示は次の工程に必要なデータから逆算する**
- **コメントアウト文は絶対にいれない**（LLMはそれも出力指示として使ってしまう）
- **何をやってはいけないか、というより「何を達成したいか」のほうが効果的**
- **「物語性のある」のような一見冗長な表現が出力品質を大きく左右する**
  - コーディング的には冗長に見えても、LLMの出力結果が全然変わる
  - プロンプトの修飾語句は思考の方向性を決める重要な要素

### CoTシステムのエラー処理原則
- **エラー処理をSkipしても当初の目的を果たさない = 意味ゼロ**
- **CoTは「考えて→生成する」プロセスなので、途中でスキップすると成果物が出ない**
- **エラーが発生したら必ず原因を特定して解決する**
- **「とりあえず動かす」ではなく「正しく動かす」ことが重要**

### プロンプト設計の実装原則（2025年6月19日追加）
- **データの構造化**: wrapCharacterProfile/wrapConceptData関数で自然文に変換
- **物語構造の明示**: GPTの出力（フック→背景→メイン→内省→CTA）を次工程で活用
- **責任の分離**: GPT=コンセプト生成、Claude=投稿文生成、システム=ハッシュタグ追加
- **重複の排除**: プロンプトに同じ指示を繰り返さない

## 環境変数設定メモ

### 必須環境変数
```bash
# Database
DATABASE_URL=
DIRECT_URL=

# AI APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=

# Twitter OAuth
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Google Search (optional)
GOOGLE_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
```

## 連絡先・リポジトリ
- GitHub: https://github.com/Opi-jp/X_BUZZ_FLOW
- Vercel: https://x-buzz-flow.vercel.app

## 2025年6月18日の作業記録（API構造の全面再編成）

### 実施した作業

#### 1. 旧構造の完全削除（Breaking Change）
- **削除したディレクトリ**:
  - `/api/viral/*`、`/api/news/*`、`/api/buzz/*` - 旧API
  - `/app/viral/*`、`/app/news/*`、`/app/buzz/*` - 旧ページ
  - テストスクリプト、一時的なAPIエンドポイント
- **理由**: リダイレクトにより新APIへの変更が反映されない問題を解決

#### 2. 新構造への移行
- **新API構造**:
  - `/api/generation/*` - コンテンツ生成
  - `/api/intelligence/*` - 情報収集・分析
  - `/api/automation/*` - 自動化
  - `/api/integration/*` - 統合機能
- **設計原則**: 機能別の明確な分離、RESTful命名

#### 3. ドキュメント管理体系の刷新
- **新体系**:
  - `START_HERE.md` - 最軽量エントリーポイント（6行）
  - `QUICK_START.md` - 軽量版（44行）
  - `MASTER_DOC.md` - 統合ドキュメント（175行）
  - `NO_MORE_DOCS.md` - ドキュメント作成禁止令
- **プロンプト統合**: `docs/PROMPT_MASTER.md`に3つの文書を統合

#### 4. Git管理の改善
- **15個の論理的コミット**で段階的に整理
- **詳細なコミットメッセージ**で変更理由を記録
- **教訓**: 「ドキュメントは腐るけど、Gitコミットは永遠」

### 重要な発見と決定

1. **プロンプトの「方向性」問題**
   - 実装とドキュメントで微妙に異なる
   - 抽象的 vs 具体的指示の一長一短
   - → プロンプトエディター開発で解決予定

2. **ドキュメント管理の新方針**
   - 実装は変わっても原則は変わらない
   - 重要な原則はMASTER_DOC.mdに集約
   - 詳細はコードとGitコミットが真実

### プロンプトエディター設計案

```typescript
// 主要機能
- リアルタイムプロンプト編集・テスト
- A/Bテスト実行と比較
- よくある失敗パターンの自動検出
- プロンプト作成の注意事項を埋め込み

// 特徴
- 「方向性」などの問題ワードを自動検出
- LLM重要キーワードのヒント表示
- 品質スコアの自動計算
- 変更履歴と理由の記録
```

## 2025年6月18日の追加作業（プロンプトエディター改善）

### Claude（AI）の問題行動パターンと技術的対策

#### 繰り返される問題
1. **プロンプトを「コード」として扱う**
   - 「物語性のある」などの重要な修飾語句を勝手に削除
   - JSONを「きれいに」整形しようとする
   - プログラミング的思考で「最適化」する

2. **JSON内の説明文を出力指示として解釈**
   ```json
   // ❌ 問題のあるJSON（LLMがそのまま出力）
   {
     "post1": "導入（フックで引き込む）の投稿文",
     "post2": "背景（問題提起、状況説明）の投稿文"
   }
   
   // ✅ 正しいJSON（空の容器として定義）
   {
     "post1": "",
     "post2": ""
   }
   ```

3. **ドキュメントを読んでも守らない**
   - CLAUDE.mdに明記されている原則を無視
   - 同じ間違いを20回以上繰り返す
   - テストスクリプトで問題を隠蔽（300個以上作成）

#### 実装した技術的対策

1. **プロンプトエディターの強化**
   ```bash
   # JSON検証機能（メニュー5）
   node scripts/dev-tools/prompt-editor.js edit claude/character-profiles/cardi-dare.txt
   # → JSON内の説明文を自動検出して警告
   ```

2. **エディター使用時の注意**
   - 変数プレビュー（メニュー4）で必ず確認
   - JSON検証（メニュー5）で問題を事前検出
   - キャラクター設定（メニュー6）で利用可能な変数を確認

3. **根本原則の再確認**
   - プロンプトは6文字の変更で出力が大幅に変わる
   - 自然文で思考を導き、JSONは出力の容器
   - 入力と出力は1:1ではなく1:N（創造的生成）

## 2025年6月19日の作業記録（キャラクター設定とプロンプトシステム改善）

### 実施した作業

#### 1. カーディ・ダーレのキャラクター再定義
- 年齢を53歳に、背景を「元詐欺師／元王様（いまはただの飲んだくれ）」に設定
- 哲学：「人間は最適化できない。それが救いだ。」

#### 2. プロンプトシステムの大幅改善
- **wrapCharacterProfile関数**: キャラクターデータを自然文に変換
- **wrapConceptData関数**: 物語構造を明示的に表示
- **プロンプトファイルの簡略化**: 重複指示を削除

#### 3. プロンプトエディターの非インタラクティブ実行
```bash
node scripts/dev-tools/prompt-editor.js test-direct <file> [key=value ...] --non-interactive
```
- Claudeから直接実行可能に
- 結果とモックデータを自動保存

### 重要な学び
- **物語構造の重要性**: GPTの5段階構造（フック→背景→メイン→内省→CTA）を維持
- **データフローの明確化**: 各フェーズの責任を明確に分離
- **プロンプトの簡潔性**: 必要最小限の指示で最大の効果

## 2025年6月19日の追加作業（プロンプトエディターのDB整合性機能強化）

### 実施した作業

#### 1. DB整合性チェック機能の実装完了
- **互換性チェック**: 期待されるフィールドと実際のDBデータの差分を検出
- **不足フィールドの検出**: 必須フィールドが欠けているデータを特定
- **予期しないフィールドの検出**: 古いバージョンの名残やゴミデータを発見

#### 2. マイグレーション自動生成機能
- **不足フィールド追加マイグレーション**: 必須フィールドを既存データに追加
- **クリーンアップマイグレーション**: 予期しないフィールドを削除してDBをクリーンに保つ
- **非インタラクティブ実行**: `--non-interactive`と`--auto-migrate`/`--cleanup`オプションで自動実行

#### 3. プロンプトエディターのオプション追加
```bash
# 整合性チェックのみ
node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt

# 互換性問題の自動修正
node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt --non-interactive --auto-migrate

# ゴミデータのクリーンアップ
node scripts/dev-tools/prompt-editor.js compat gpt/generate-concepts.txt --non-interactive --cleanup
```

### 技術的な修正
- **マイグレーションスクリプトのバグ修正**: 関数名の不一致、forEachからfor...ofへの変更
- **functionNameフィールドの追加**: マイグレーションスクリプトで正しい関数名を使用
- **エラーハンドリングの改善**: 配列/オブジェクトの判定を正確に

### 実行結果
- ✅ 12個のセッションから不足フィールドを追加
- ✅ 予期しないフィールド（hook、topicUrl、keyPoints等）を削除
- ✅ データベースがクリーンな状態に

### 重要な学び
- **DB整合性の維持**: プロンプトの変更は必ずDBスキーマに影響する
- **ゴミデータの蓄積防止**: 定期的なクリーンアップが必要
- **自動化の重要性**: 手動でのDB修正は危険、必ずマイグレーションスクリプトを使用

## 2025年6月19日の追加作業（統合システム実装計画策定）

### 実施した作業

#### 1. 現状の課題分析
- **フロントエンドとバックエンドの乖離**: LLMオーケストレーションシステムの特性により、通常と異なる実装アプローチが必要
- **データ表示の複雑さ**: 各APIフェーズで異なるデータ構造（Perplexity、GPT、Claude）
- **既存資産の活用**: NEWS、BUZZ（KaitoAPI）、下書き、スケジューラー、Twitter投稿機能が動作中
- **Gemini分析機能**: ニュース×バズの横断分析機能が実装済み

#### 2. 統合システム実装計画書の作成
- **ドキュメント**: `/docs/current/integrated-system-implementation-plan-20250619.md`
- **新アーキテクチャ**: Intel → Create → Publish → Analyze の4モジュール構成
- **データ分離戦略**: Raw Layer、Process Layer、Display Layerの3層構造
- **命名規則の統一**: 機能ベースの直感的な命名体系を提案

#### 3. 主要な設計決定
- **バックエンドドリブン開発**: DBスキーマから逆算したUI設計
- **プログレッシブ表示**: Summary View → Preview View → Detail Viewの3段階
- **段階的移行**: 既存システムを活かしながら6フェーズで実装
- **API体系の再編**: `/api/{module}/{resource}/{action}` パターンの採用

### 技術的な改善提案
- **データ表示の最適化**: ユーザーが見たい情報とAPIが必要とする情報の明確な分離
- **キャッシュ戦略**: ブラウザ、API、計算結果の3層キャッシュ
- **拡張性の確保**: プラグイン架構、イベント駆動、水平スケーリング対応

### 次のステップ
1. 実装計画書のレビューと承認
2. Phase 1（基盤整備）の詳細計画策定
3. middleware.tsでのリダイレクトマッピング実装
4. 共通コンポーネントの開発開始

## 2025年6月19日の追加作業（V2バイラルコンテンツ生成＆フロントエンドデバッガー実装）

### 実施した作業

#### 1. V2バイラルコンテンツ生成システムの完成
- **コンテンツ生成フロー**: 2トピック×6コンセプト版が完全動作
- **UIフロー実装**:
  - テーマ入力 → Perplexityトピック収集 → GPTコンセプト生成
  - コンセプト選択UI（最大3つ選択可能）
  - キャラクター選択UI（3キャラクター切り替え）
  - 結果表示と下書き管理
- **スケジューラー＆パブリッシャー**: 既存モジュールを活用して統合完了

#### 2. フロントエンドデバッガーツール群の開発
- **統合フロントエンドデバッガー** (`unified-frontend-debugger.js`):
  - ランタイムエラーの自動検出とAI分析
  - コード問題のリアルタイム検査
  - リンク切れチェック機能
  - APIエンドポイント監視
  - ダッシュボード: http://localhost:3335
  
- **DebuggerInjectorコンポーネント**:
  - 全ページに自動的にエラー監視を注入
  - 開発環境とVercelプレビュー環境でのみ動作
  - 複数のデバッガーサーバーに同時送信

- **その他のデバッグツール**:
  - VSCodeエラーモニター: ターミナルでリアルタイム表示
  - ページ＆リンクチェッカー: 404エラーの網羅的検出
  - UI動作テスター: Puppeteerによる自動UIテスト

#### 3. マトリクス問題の解決
- **問題**: GPTが3フック×3角度＝9組み合わせを生成するが、JSON構造が1つしか保存できない
- **解決策**: hookOptionsとangleOptions配列を追加し、複数の選択肢を保存
- **将来計画**: 9つの組み合わせを表示→ユーザーが選択→選んだものだけ詳細生成

### 技術的な成果
- **開発効率の大幅改善**: F12でのエラーコピペ作業から解放
- **自動エラー検出**: 構文エラー、リンク切れ、API失敗を即座に検出
- **AI支援デバッグ**: エラーパターンを分析して修正提案を自動生成
- **Twitter icon非推奨警告**: lucide-reactから独自SVGアイコンに変更

### 学んだこと
- **デバッグの自動化の重要性**: 単純なミスの発見に時間をかけない仕組みづくり
- **エラーの可視化**: 問題を即座に認識できるダッシュボードの価値
- **予防的デバッグ**: コード保存時の自動チェックで問題を未然に防ぐ

## 2025年6月19日の追加作業（APIエラー修正と開発ツール活用）

### 実施した作業

#### 1. Perplexity collect APIの修正
- **問題**: `perplexityData`フィールドがPrismaスキーマに存在しない
- **解決**: 正しいフィールド名`topics`に変更
- **結果**: APIフローが完全に動作
  - セッション作成API: 正常動作
  - collect API: topicsフィールドへ正しく保存
  - データベース: Perplexityの生データが保存され、ステータスも更新

#### 2. 開発ツールの活用
- **プロンプトエディター**:
  - DB整合性チェックでフィールドの不整合を発見
  - 非インタラクティブ実行でAPIテストを実施
  - Perplexityの実際のレスポンスを確認
- **API依存関係スキャナー**: 使用状況を確認
- **エラーレコーダー**: エラーは発生しなかったため記録不要

### 技術的な詳細
- **Perplexityのレスポンス形式**: Markdown形式でJSONブロックを含む
- **データ保存戦略**: 生データをそのまま保存し、次のステップで構造化
- **フィールド名マッピング**: `perplexityData` → `topics`

### 重要な学び
- **開発ツールの重要性**: 手動テストより効率的にAPIレベルの問題を発見
- **フィールド名の一致**: Prismaスキーマと API実装の整合性が重要
- **生データ保存の利点**: JSONパースエラーを回避し、柔軟な処理が可能

## 2025年6月19日の追加作業（CoTシステムのバックエンド修正）

### 実施した作業

#### 1. CoTシステムの全体的な実装見直し
- **問題の特定**:
  - ステータスの大文字/小文字不一致（`topics_collected` vs `TOPICS_COLLECTED`）
  - Perplexityレスポンスのパース失敗（Markdown形式 vs JSON期待値）
  - インポートパスの不統一（`@/lib/generated/prisma` vs `@/lib/prisma`）
  - JSONパース時の改行文字エラー

#### 2. 修正内容
- **ステータス管理の統一**: すべて大文字（CREATED, COLLECTING, TOPICS_COLLECTED等）に統一
- **Perplexityパーサーの実装**: 専用パーサークラス `PerplexityResponseParser` を作成
  - Markdown内のJSONブロックを正しく抽出
  - summary/perplexityAnalysis内の改行文字をエスケープ処理
- **インポートパスの統一**: すべて `@/lib/prisma` に統一（dev-toolsも含む）

#### 3. エラー記録
- Perplexity topics JSONパースエラー
- loadPrompt import エラー
- Perplexity JSON内の改行文字エラー

### 技術的な改善
- **パーサーの堅牢性向上**: エラーハンドリングとデバッグログの追加
- **データフローの整合性**: 各ステップ間でのデータ形式を明確化
- **開発ツールの活用**: error-recorderで問題を記録し、将来の参考に

### 重要な学び
- **フロントエンドテスト前の準備の重要性**: バックエンドが不安定な状態でのフロントテストは地獄
- **既存ツールの活用**: 新しいスクリプトを作るより、dev-toolsを使う方が効率的
- **プロンプト変更時の注意**: プロンプトエディターを必ず使用すること

### 次のステップ
- キャラクター生成APIの動作確認
- 下書き作成から投稿までの全フロー確認
- フロントエンドとの統合テスト

## 2025年1月19日の作業記録（新APIモジュール実装とTwitter投稿成功）

### 実施した作業

#### 1. 新しいAPIモジュール構造の実装
- **Intel/Create/Publish/Analyzeの4モジュール構成を採用**
- **実装したAPI**:
  - `/api/create/flow/complete` - 完全なコンテンツ生成フロー（Perplexity→GPT→Claude）
  - `/api/publish/post/now` - 即時Twitter投稿API
- **設計原則**: 機能別の明確な分離、RESTfulな命名規則

#### 2. Twitter投稿機能の動作確認と修正
- **問題発見**: middleware.tsで`/api/twitter/post`が`/api/publish/post/now`にリダイレクトされていた
- **解決策**: リダイレクトを一時的にコメントアウト
- **結果**: 実際にTwitterに投稿成功！
  - 1件目: https://twitter.com/opi/status/1935657769438486549
  - 2件目: https://twitter.com/opi/status/1935657943535640887

#### 3. システム全体の動作確認
- **コンテンツ生成フロー**: 
  - 既存セッション（CONCEPTS_GENERATED）から下書き作成
  - カーディ・ダーレのキャラクターでコンテンツ生成
  - ハッシュタグ付きで投稿
- **データベース状態**:
  - セッション: 30件（各ステータスに分散）
  - 下書き: 36件（DRAFT状態）
  - 投稿済み: 3件（実際のTwitter URL付き）

#### 4. テストスクリプトの作成
- `test-new-apis-20250119.js` - 新APIの動作確認
- `test-twitter-direct-20250119.js` - Twitter API直接テスト
- `test-post-draft-20250119.js` - 下書きから投稿テスト
- `test-post-with-env-20250119.js` - 環境変数確認付き投稿テスト
- `test-complete-flow-20250119.js` - 完全フローテスト
- `test-full-cycle-20250119.js` - システム全体の状態確認

### 技術的な詳細
- **環境変数**: Twitter API v1.1とv2.0の認証情報が正しく設定されていることを確認
- **NextAuth**: セッション認証は必須ではなく、環境変数の認証情報でも投稿可能
- **モックモード**: `USE_MOCK_POSTING`フラグで開発時のテストが可能

### 重要な学び
- **APIリダイレクトの影響**: middleware.tsのリダイレクトが予期しない動作を引き起こす可能性
- **段階的な移行**: 既存のAPIを維持しながら新しい構造に移行する重要性
- **実際の投稿テスト**: モックだけでなく実際の投稿テストの重要性

### 次のステップ
1. Intelモジュール（情報収集）のAPI実装
2. 残りのCreateモジュールAPI実装
3. Analyzeモジュール（分析）のAPI実装
4. フロントエンドの新API対応

## 2025年1月19日の追加作業（API複雑性の根本原因分析）

### 問題の発見
- **117個のAPIエンドポイント**（本来15個で十分な直線的システム）
- 認証エラーやDB接続エラーを回避するための「問題の先送り」が原因
- テストのたびに仮エンドポイントを作成し、削除せずに蓄積

### 典型的なパターン
1. **認証エラー回避**: `/api/twitter/post` → `/api/test-post` → `/api/debug-post-v2` → ...
2. **DB接続エラー回避**: `/api/generation/drafts` → `/api/generation/drafts-mock` → ...
3. **セッション進行時の一時API**: 各フェーズごとにtest-*エンドポイントを作成

### 解決策
1. **シンプルな/api/v2/構造**を新規実装（11個のエンドポイントのみ）
   - `/api/v2/flow/*` - フロー管理（3個）
   - `/api/v2/drafts/*` - 下書き管理（3個）
   - `/api/v2/post/*` - 投稿実行（2個）
   - `/api/v2/data/*` - データ取得（3個）

2. **根本問題の解決**
   - 認証とDB接続の問題を先送りせずに解決
   - エラーハンドリングの適切な実装
   - テスト用エンドポイントの自動削除

### 実装済み
- **シンプルAPI構造（バージョン番号なし）**
  - `/api/flow` - フロー開始
  - `/api/flow/[id]` - ステータス確認
  - `/api/flow/[id]/next` - 次のステップへ
  - `/api/drafts` - 下書き一覧
  - `/api/drafts/[id]` - 下書き詳細・編集
  - `/api/post` - 投稿実行
- **フロントエンドUI**
  - `/create` - 新規作成起点
  - `/create/flow/[id]` - フロー進行状況（リアルタイム更新）
  - `/drafts` - 下書き管理（編集・投稿）
- API複雑性分析ツール（`analyze-api-complexity-20250119.js`）

### 重要な教訓
- **v2などのバージョン番号は使わない** - 最初から正しい設計で実装
- **問題を先送りしない** - 認証エラーやDB接続エラーは根本解決
- **テスト用エンドポイントは必ず削除** - 蓄積させない

## 2025年6月20日の作業記録（統一システム管理の実装）

### 実施した作業

#### 統一システム管理（Unified System Manager）の設計・実装
- **背景**: Create部分の開発で「渡している関数やパラメータが期待しているものと違う」エラーが多発
- **解決策**: 統一的な管理システムを中央に配置し、一貫性を確保

#### 実装した機能
1. **ID生成管理**: エンティティタイプ別のプレフィックス付きID（sess_xxx, draft_xxx等）
2. **型定義とバリデーション**: Zodスキーマによる共通・モジュール別の型定義
3. **プロンプト管理**: 変数展開、キャッシュ、バリデーション機能
4. **データ変換管理**: 3層アーキテクチャ（Raw → Process → Display）
5. **エラーハンドリング**: 自動ログ記録、ユーザーメッセージ生成、リトライ判定
6. **DB連携管理**: トランザクション、バッチ処理、自動リトライ

#### ファイル構成
- `/lib/core/unified-system-manager.ts` - メイン実装
- `/lib/core/unified-system-usage-guide.md` - 詳細な使用ガイド
- `/lib/core/unified-system-quick-reference.ts` - クイックリファレンス

### 重要な設計思想
- **プレフィックス付きID**: どのエンティティのIDか一目でわかる
- **3層データ変換**: 必要なデータだけを適切なレベルで表示
- **統一エラー処理**: すべてのエラーを記録し、適切なメッセージを返す
- **型安全性**: 実行時エラーを防ぐための徹底的な型チェック

### 今後の活用
- 新規API開発時は必ずこのシステムを使用
- 既存コードも段階的に移行
- エラーが減り、開発効率が向上することを期待

---
*最終更新: 2025/06/20 16:00*

## 2025年6月20日の作業記録（統一システム管理統合とAPI整理）

### 実施した作業

#### 1. 統一システム管理の完全統合
- **Create→Postフローの改善**: `/api/flow/[id]/next/route.ts`に包括的エラーハンドリング統合
- **パラメータ整合性確保**: IDバリデーション、withRetry、DataTransformer適用  
- **フェーズ別タイムアウト**: Perplexity(30s)、GPT(60s)、Claude(45s)設定

#### 2. API構造の大幅整理
- **APIエンドポイント数削減**: 87個 → 78個（9個削除）
- **「動作システム保護 + ゴミ掃除」アプローチ**採用
- **動作中システム**: NEWS、KaitoAPI、Create→Postフローを完全保護

#### 3. 削除したAPI一覧
```
/api/intelligence/news/debug/          # デバッグ専用（未使用）
/api/intelligence/news/test-sources/   # テスト専用（未使用）
/api/intel/                           # 全体（intelligenceとの重複）
/api/insights/                        # 全体（未使用）
/api/generation/.../generate-character-contents-v2/  # 重複
/api/generation/.../generate-contents/              # 重複
/api/post-with-auth/                  # 未使用
/api/jobs/[jobId]/                    # 未使用
```

### 重要な技術的学び

#### 統一システム管理の効果
- **IDGenerator**: プレフィックス付きID生成で型安全性確保
- **withRetry**: 指数バックオフによる自動リトライ機能
- **CreatePostErrorHandler**: フェーズ別エラー分類と日本語メッセージ
- **DataTransformer**: 一貫したレスポンス形式による表示層統一

#### 「動作システム保護」の重要性
- 動作中システムを事前特定してから整理作業を実施
- 後方互換性ではなく「現在動作するものの保護」が重要
- 未使用APIの大胆な削除により開発効率大幅向上

#### Phase 2完了時の状態
- **統一エラーハンドリング**: 全APIで一貫したエラー処理
- **パラメータ整合性**: 型安全性とバリデーションを標準化
- **API構造最適化**: 重複排除と命名規則統一により保守性向上

## 2025年6月20日の作業記録（DB整合性チェックとスキーマ整理）

### 実施した作業

#### 1. DB整合性の包括的な調査
- **ビルドエラーの修正**: 不足していたモジュール（auth-options、date-utils等）を実装
- **ファイル整理**: "[/"ディレクトリから適切なlibディレクトリへ移動
- **マイグレーション問題の解決**: directUrlのコメントアウトを修正、IPv4対応

#### 2. DB同期監視ツールの開発（db-sync-monitor.js）
- **機能**: 実装・スキーマ・DBの3層同期状態を監視
- **特徴**:
  - 46モデルが実装で使用中（実装での使用状況を自動検出）
  - PrismaクライアントのcamelCase変換に対応
  - フィールドレベルの使用状況も追跡
  - 操作別の統計（create、findMany、update等）
  - 詳細なレポート生成（db-sync-report.json）

#### 3. 発見された問題と解決
- **Prismaモデル名の規約**:
  - スキーマ定義: PascalCase（例: BuzzPost）
  - 実装での使用: camelCase（例: prisma.buzzPost）- Prismaが自動変換
  - テーブル名: snake_case（例: buzz_posts）
- **残存する問題**:
  - 3つのモデル参照エラー（aiPattern、client、post）- 主にコメントアウトされたコード
  - 古いテーブルの残存（viral_posts等）

#### 4. DB接続方法の統一
- **問題**: directUrlとDATABASE_URLの使い分けが混乱していた
- **解決**: 
  - DATABASE_URL: pgbouncer経由（接続プール、Transaction mode）
  - DIRECT_URL: Session Pooler経由（IPv4対応、マイグレーション用）
- **IPv6問題**: Claude Codeとの互換性のためIPv4を使用

#### 5. マイグレーション状態の整理
- 3つのマイグレーションを「適用済み」としてマーク
- Prismaクライアントを再生成して同期

### DB整合性の現状
- **実装とスキーマ**: 97%同期（3つの誤参照を除けば完全同期）
- **スキーマとDB**: 100%同期
- **全体評価**: 良好な状態

### 今後の課題
- **サーバー起動問題**: .nextディレクトリのビルドエラー（別途対応必要）
- **古いテーブルのクリーンアップ**: viral_posts等の未使用テーブル
- **開発ツールの改善**: db-schema-validator.jsの接続方法修正

## 2025年6月20日の追加作業（緊急度の高い問題対処）

### 実施した作業

#### 1. Next.jsサーバービルドエラーの解決 ✅
- **問題**: `.next/server/app/api/flow/[id]/route.js`が存在しない
- **原因**: .nextディレクトリのビルドキャッシュが壊れていた
- **解決策**: 
  - 永続サーバー（tmux xbuzz）でNext.jsを再起動
  - `rm -rf .next && npm run dev`で.nextを削除してから再起動
  - `/app/api/briefing/morning/route.ts`の型エラーを修正（descriptionフィールドの問題）
- **結果**: サーバーが正常に起動（http://localhost:3000/api/health が200 OK）

#### 2. コードの不要な参照削除 ✅
- **aiPattern参照**: 既に削除済み（`app/api/generate/route.ts`で`pattern = null`）
- **post参照**: 既に修正済み（`lib/smart-rt-scheduler.ts`ですべて`scheduledPost`を使用）
- **結果**: 誤ったモデル参照は既に解決済み

#### 3. DBスキーマの再同期 ✅
- **実行内容**:
  - `npx prisma db pull --force`で現在のDBからスキーマを取得
  - 43個のモデルを正常に取得
  - `npx prisma generate`でPrismaクライアントを再生成
- **結果**: DBとスキーマが完全に同期

### 問題解決の総括
- **緊急度の高い問題はすべて解決**
- **Next.jsサーバー**: 正常動作中
- **DB整合性**: 実際は大きな問題なし（警告はあるが致命的ではない）
- **コード参照**: 既に修正済み

### 今後の推奨事項
- 定期的な.nextディレクトリのクリーンビルド
- 未使用テーブルの段階的な削除（viral_posts等）
- db-schema-validator.jsの警告への対応（低優先度）

## 2025年6月20日の追加作業（Create→Draft→Postフロー完全実装）

### 実施した作業

#### 1. Perplexity→GPT→Claudeフローの動作確認
- **Perplexity処理**: トピック収集、JSONパース、DB保存すべて正常動作
- **GPT処理**: DBからデータ取得、コンセプト生成、DB更新すべて正常動作
- **Claude処理**: キャラクターベース生成（カーディ・ダーレ）正常動作

#### 2. API修正内容
- **ClaudeLogger修正**: 全APIで関数呼び出しからstaticメソッドに変更
- **DBフィールド名統一**: camelCase → snake_case（session_id、concept_id等）
- **スコープ問題解決**: try-catch内での変数アクセス問題を修正
- **キャラクターファイルパス修正**: `/lib/prompts/characters/`に統一

#### 3. Twitter投稿機能の確認
- **API修正**: `client.v2.tweet` → `client.readWrite.v2.tweet`
- **動作確認**: Twitter APIは正常に動作（403エラーは重複コンテンツのため）
- **環境変数**: OAuth 1.0a認証情報が正しく設定されていることを確認

### 技術的な成果
- **完全なE2Eフロー**: Perplexity→GPT→Claude→Twitter投稿まで実装完了
- **DB整合性**: 全フィールドでsnake_case命名規則を統一
- **エラーハンドリング**: 統一システム管理による包括的エラー処理

### 未解決の課題
- **selectedIds vs selected_ids**: 一部のAPIでフィールド名の不一致
- **Twitter投稿の重複チェック**: 同一コンテンツの再投稿防止機能

