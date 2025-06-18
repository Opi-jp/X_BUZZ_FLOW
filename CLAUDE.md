# X_BUZZ_FLOW プロジェクト概要

## 🚀 クイックスタート

### 開発環境の起動
```bash
# 1. 環境のヘルスチェック
./scripts/dev-tools/health-check.sh

# 2. 永続サーバーの起動（必須）
./scripts/dev-persistent.sh  # tmuxで永続的な起動
# または Prisma Studioなしバージョン
./scripts/dev-persistent-no-studio.sh

# ⚠️ 重要: 
# - ポート3000必須（Twitter認証のWebhookが3000を指定）
# - npm run devは使用しない（APIタイムアウトが発生する）
# - tmuxがインストールされていることが前提条件
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

### エラー解決支援
```bash
# 過去のエラー解決策を検索
node scripts/dev-tools/find-error.js "database"
node scripts/dev-tools/find-error.js "prisma" --detail

# 新しいエラーを記録
node scripts/dev-tools/error-recorder.js
node scripts/dev-tools/error-recorder.js --quick "エラー名" "解決策"

# エラーカテゴリを表示
node scripts/dev-tools/find-error.js --categories
```

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

## 🎯 現在のシステム状態（2025年6月18日時点）

### Mission Control / CoT統合実装完了

#### 主要な変更点：
- **APIディレクトリ命名規則統一**
  - Intelligence（情報収集・分析）
  - Generation（コンテンツ生成）
  - Automation（自動化・投稿）
  - Integration（外部API連携）

- **CoT三段階構成（新仕様）**
  ```
  Step 1: Perplexity - 情報収集
  Step 2: GPT - コンセプト化
  Step 3: Claude - キャラクター化＋完成投稿
  ```

- **V2バイラルコンテンツ生成システム**
  - expertise → theme への変更完了
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
└── work-logs/         # 作業記録アーカイブ
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

---
*最終更新: 2025/06/19 12:00*