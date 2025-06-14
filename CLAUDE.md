# X_BUZZ_FLOW 作業記録

## プロジェクトオーナーの目標とビジョン

### 背景
- LLMの進展により、従来までの「会社で働く」「受託で仕事を受ける」などの働き方に大きな変革が訪れると予想
- 50歳を超えてセカンドキャリアを考える必要がある
- 自由な時間は確保したいので、TwitterやSNSを駆使して、ベーシックインカムと影響力を確保する必要がある

### キャリア
- 25歳のときに友人とNAKEDという映像制作会社を設立
- 以来、23年にわたりクリエイティブディレクター／プロデューサーとして活動
- 2012年よりプロジェクションマッピングなどで有名になる
- 映像／デザイン／WEB／マーケティングの分野で活動実績あり
- 大屋友紀雄で検索すればそれなりに実績の結果がでる

### 発信軸
- **メインテーマ**: クリエイティブの発想を使ってLLMをどう活用しながら、新しい時代を生き抜くか
  - LLMをクリエイティブの現場にどう活かすか、ということではない
  - 23年のクリエイティブ経験を活かした独自の視点
- **サブテーマ**: 
  - AI関連の紹介（フォロワーを集めるため）
  - 働き方などの未来予測

### 短期KPI（3ヶ月）
- **フォロワー**: 青バッジフォロワー2,000人達成
- **インプレッション**: 500万インプレッション達成
- **収益化**: Xサブスクライブ機能での収入確立

## システム概要（2025年6月時点）

### 技術スタック
- **Frontend**: Next.js 15.3 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **AI**: GPT-4o (OpenAI) + Claude 3 Opus (Anthropic)
- **ORM**: Prisma

### 重要な実装詳細

#### Chain of Thought (CoT) 実装
- **5段階プロンプト構造**を採用（ChatGPTプロンプトに基づく）
- 各ステップの結果をDBに保存し、次ステップで参照
- プロンプトの品質が全体の精度に大きく影響するため、簡略化は避ける

#### Step 1の2段階実装（JSON切れ対策）
```
Phase 1-A: Responses API + Web検索で記事URL収集
Phase 1-B: Chat Completions APIで詳細分析（max_tokens: 4000）
```

### データ収集の制限事項（2025年6月現在）
- **Twitter API**: Metrics系APIが使用不可（2025年より制限）
- **代替手段**: Kaito API (Apify) を使用してバズ投稿とメトリクスを収集
  - エンゲージメント数、インプレッション数を取得可能
  - kaitoeasyapi.comのエンドポイントを使用
- RSS収集を中心とした情報収集システム

## Vercelデプロイ時の注意事項

### よくあるVercelデプロイエラーと解決策

1. **Node.jsバージョンの不一致**
   - **問題**: ローカルは18.x、Vercelが20.xで爆死
   - **解決策**:
   ```json
   // package.json
   "engines": {
     "node": "18.x"
   }
   ```
   または `.nvmrc` ファイルを作成:
   ```
   18.20.0
   ```

2. **開発用モジュールが本番で消える**
   - **問題**: `devDependencies`のモジュールが本番ビルドで除外
   - **例**: ts-node, @types/*, eslint-plugin-*
   - **解決策**: 
     - ビルドに必要なものは`dependencies`に移動
     - または`vercel.json`で設定:
     ```json
     {
       "installCommand": "npm install --production=false"
     }
     ```

3. **ファイル名の大文字小文字問題**
   - **問題**: Mac（大文字小文字区別なし） vs Vercel/Linux（区別あり）
   - **例**: `./components/Button.tsx` vs `./components/button.tsx`
   - **解決策**:
   ```bash
   # Gitで正しいファイル名に修正
   git mv components/button.tsx components/Button.tsx
   # importも修正
   import Button from './components/Button' // 大文字小文字を厳密に
   ```

4. **環境変数の未設定**
   - **問題**: `.env.local`はあるがVercelに環境変数なし
   - **解決策**:
   ```bash
   # Vercel CLIで設定
   vercel env add
   # または管理画面で設定後、ローカルに同期
   vercel env pull .env.local
   ```

5. **ビルドコマンドの相違**
   - **問題**: ローカルとVercelでビルドステップが異なる
   - **解決策**: `vercel.json`で明示的に指定
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next"
   }
   ```

### 環境差異によるエラー防止策

1. **TypeScript設定**
   - config構造の違いに注意：
   ```typescript
   // 安全なアクセス方法
   config.config?.expertise || config.expertise || 'デフォルト値'
   ```

2. **データベース接続**
   - Pooler URL（アプリケーション用）: Vercel環境で使用
   - Direct URL（マイグレーション用）: ローカル開発で使用

### Vercelとローカル環境の同期

1. **環境変数の同期**
   ```bash
   # Vercel CLIで環境変数をプル
   vercel env pull .env.local
   ```
   - Vercelダッシュボードで設定した環境変数をローカルに反映
   - 新しい環境変数追加時は必ず両環境で設定

2. **ビルドテスト**
   ```bash
   # ローカルで本番ビルドを実行
   npm run build
   # 成功後にデプロイ
   git push origin main
   ```

3. **データベーススキーマの同期**
   - Prismaマイグレーションは必ずローカルで実行・テスト
   - 本番DBへの適用は慎重に（データ損失に注意）

4. **依存関係の管理**
   - package-lock.jsonを必ずコミット
   - 新しいパッケージ追加後は必ずビルドテスト

### デバッグチェックリスト（エラー時の確認順序）

1. **まずVercelのFunction Logsを確認**
   ```bash
   vercel logs --follow
   ```

2. **よくあるエラーと対処法**
   - `Module not found`: ファイル名の大文字小文字をチェック
   - `Cannot find module '@/...'`: tsconfig.jsonのpathsとVercelの整合性確認
   - `Environment variable not found`: Vercel管理画面で環境変数確認
   - `Prisma Client error`: `postinstall`スクリプトに`prisma generate`があるか確認

3. **ローカルでVercel環境を再現**
   ```bash
   # Vercelと同じNode.jsバージョンを使用
   nvm use 18
   
   # production buildを実行
   NODE_ENV=production npm run build
   
   # Vercelと同じ環境変数で起動
   vercel dev
   ```

## GPTバイラルシステム完成版（2025年6月13日）

### 5段階Chain of Thought実装完了

**System Status: ✅ FULLY OPERATIONAL**

#### 完全動作確認済み（2025/06/13）
- **Step 1**: Web検索+詳細分析（46秒、9記事収集）
- **Step 2**: トレンド評価（10秒、機会スコアリング）
- **Step 3**: コンセプト生成（29秒、3つのコンセプト）
- **Step 4**: 完全コンテンツ生成（27秒、投稿準備完了）
- **Step 5**: 実行戦略策定（29秒、KPI・戦略設定）

**総実行時間**: 141秒（約2分20秒）
**生成コンテンツ例**: 「🌟AIが未来の働き方を革命！AIエージェントがどのように私たちの仕事を変えるか、知っていますか？ #AI #働き方革命」

### 投稿支援機能実装（2025/06/13）

#### Phase 1 完成機能
1. **下書き管理システム**
   - 編集API: `/api/viral/drafts/[id]`
   - 編集UI: `/app/viral/drafts/[id]/page.tsx`
   - 文字数カウント、ハッシュタグ管理

2. **即座投稿機能**
   - API: `/api/viral/post-draft`
   - Twitter OAuth認証連携
   - 下書き一覧から「今すぐ投稿」ボタン

3. **パフォーマンス追跡**
   - API: `/api/viral/performance/[id]`
   - 30分、1時間、24時間後の自動メトリクス取得
   - エンゲージメント率計算

#### 技術的解決事項
- Vercel PROプラン対応（maxDuration: 300秒）
- 動的パラメータ名統一（[draftId]→[id]）
- TypeScriptスコープエラー修正
- Step 1のタイムアウト対策（記事数削減、トークン数最適化）

### 技術実装詳細

#### 使用AI API
1. **OpenAI GPT-4o**（メイン）
   - Chain of Thought全5ステップ
   - コンテンツ生成・分析
   - モデル切替可能（GPT-4-turbo-preview）

2. **Perplexity AI**
   - モデル: llama-3.1-sonar-large-128k-online
   - リアルタイム情報収集
   - 最新トレンド分析

3. **Anthropic Claude**
   - モデル: claude-3-haiku-20240307
   - 現状: テスト段階（本番未使用）

#### データベーステーブル構造
- **GptAnalysis**: 分析結果保存
- **ContentDraft**: 下書き管理
- **ViralOpportunity**: トレンド機会
- **ViralPost**: 投稿管理
- **ViralPostPerformance**: パフォーマンス追跡

### アクセスURL
- **メイン**: `/viral/gpt` - GPTバイラルシステム
- **下書き管理**: `/viral/drafts` - 下書き一覧・編集
- **ニュース管理**: `/news` - ニュース収集・分析
- **統合分析**: `/integrated-analysis` - 分析ダッシュボード

### 動作モード
- **通常モード**: 5段階Chain of Thought（約2分20秒）
- **高速モード**: chain-fast - 単発投稿生成（5秒以内）
- **ハイブリッドモード**: chain-hybrid - バランス型

## 仕様書レビュー結果（2025/06/13）

### 実装済み機能（90%完成）
- ✅ **フェーズ0-4の完全実装**
  - バズるコンテンツ戦略家としての人格設定
  - 5段階のChain of Thought実装
  - 各フェーズでのDB保存

- ✅ **技術的要件の達成**
  - Response API + GPT-4oでWeb検索実装
  - Function Callingを全ステップで活用
  - 2段階アプローチでタイムアウト対策

- ✅ **コンテンツ管理機能**
  - 編集画面（文字数カウント、ハッシュタグ管理）
  - 即座投稿機能
  - パフォーマンストラッキング

### 未実装・改善が必要な点
1. **検索カテゴリのハードコード問題**
   - 8カテゴリが固定されている
   - expertiseに基づく動的生成が必要

2. **スケジュール投稿機能**
   - DBにscheduledAtは保存されるが自動投稿なし
   - Vercel Cronまたは外部サービス実装が必要

3. **ABテスト機能**
   - オープニングフックのバリエーション生成
   - 結果分析機能

## 今後の作業

### Phase 2計画（優先度順）
1. **検索カテゴリの動的生成**
   - expertiseに基づくカテゴリ生成ロジック
   - 関連キーワードの動的抽出

2. **スケジュール投稿の完全実装**
   - Vercel Cronでの定期実行
   - 予約投稿の自動実行機能
   - 投稿結果の通知機能

3. **ABテスト機能**
   - オープニングフックのバリエーション生成
   - パフォーマンス比較分析
   - 勝ちパターンの自動学習

4. **分析機能の拡充**
   - 傾向分析ダッシュボード
   - 競合分析機能
   - ROI計算・最適化

5. **学習システム**
   - 過去の高パフォーマンス投稿分析
   - コンテンツパターンの自動学習
   - 個人化されたコンテンツ生成

## 重要な設計思想（Chain of Thought）

### バズるコンテンツ戦略家システム
このシステムは、ChatGPTで実績のある「バズるコンテンツ戦略家」プロンプトをAPI実装したものです。

#### 設計原則
1. **汎用性**: 特定分野（AI等）にハードコードしない
2. **ユーザー設定の3要素**:
   - 発信したい分野（自由入力）
   - プラットフォーム（Twitter/TikTok/Instagram/LinkedIn/YouTube）
   - コンテンツスタイル（教育/エンターテイメント/解説/個人的な話）
3. **視点の動的選択**: 固定視点は設けず、トレンドに最適な視点を都度選択
4. **Chain of Thought**: 各フェーズは前のフェーズの結果を引き継ぐ

#### フェーズ構成
- **Phase 1**: トレンド収集（全分野を網羅的に調査）
- **Phase 2**: 機会評価（ユーザー分野に関連するものを抽出・評価）
- **Phase 3**: コンセプト生成（3つの異なるアプローチ）
- **Phase 3B**: 完全なコンテンツ生成
- **Phase 4**: 実行戦略

#### 重要な注意事項
- 各フェーズで条件をハードコードしない
- オリジナルプロンプトの構造を忠実に再現
- この設計思想はClaude Codeのセッションが切れても保持すること

## 2025年6月13日の追加実装（午後）

### 新しいChain of Thoughtアーキテクチャ

#### DB構造の刷新
1. **CotSessionモデル**
   - 状態管理（PENDING, THINKING, EXECUTING, INTEGRATING, COMPLETED）
   - フェーズ・ステップ管理
   - リトライ・タイムアウト機能
   
2. **CotDraftモデル**
   - 詳細なコンセプト情報
   - 編集・投稿管理
   - パフォーマンス追跡対応

#### 新APIエンドポイント
- `/api/viral/cot-session/create` - セッション作成
- `/api/viral/cot-session/[sessionId]/process` - 処理実行
- `/api/cron/process-cot-sessions` - 2分ごとの自動処理

#### Orchestratedアプローチ
- Think → Execute → Integrate の3段階構造
- 動的検索クエリ生成（ハードコード問題解決）
- Google Custom Search API統合
- ワークフローに基づく精密なプロンプト設計

#### 検索戦略の改善
1. **ステップ0**: テーマと役割の把握
2. **ステップ1**: 検索クエリの設計（テーマ解体→語彙設計→クエリ構成）
3. **ステップ2**: 検索実行と結果整理
4. **ステップ3**: GPTによる分析と機会特定

#### 非同期処理対応
- Cronジョブによる自動実行（2分間隔）
- 状態管理によるレジューム機能
- タイムアウト・リトライ機能

#### Google Custom Search API実装
- `/lib/google-search.ts` - APIクライアント実装
- 検索クエリの実行（Phase1のExecuteステップ）
- ニュース・日本語・SNS特化検索対応
- `/docs/google-custom-search-setup.md` - セットアップガイド

## 2025年6月13日の追加実装（午前）

### Orchestrated Chain of Thought実装
- **新ファイル**: `/lib/orchestrated-cot-strategy.ts`
  - Think → Execute → Integrate の3段階アプローチ
  - 動的な検索クエリ生成を実現
  - ハードコード問題の解決策として実装

- **Step1-Orchestrated**: `/app/api/viral/gpt-session/[sessionId]/step1-orchestrated/`
  - Phase 1: GPT-4oで検索クエリ生成
  - Phase 2: Google Custom Search API実行（スケルトン）
  - Phase 3: 結果の統合・分析

### Orchestrated Chain of Thought実装（2025/06/14更新）
- **新アーキテクチャ**: Response API廃止、GPT-4oによる動的検索クエリ生成
  - Think: GPT-4oが検索クエリを動的生成（ハードコード排除）
  - Execute: Google Custom Search APIで実際の検索実行
  - Integrate: 結果の統合と分析
- **Google Custom Search API統合完了**
  - APIキー・Search Engine ID設定済み
  - 7日以内のニュース検索に特化

## 2025年6月14日の実装（Vercelデプロイ準備）

### 重要な修正事項

#### 1. 404エラーの解消
- `/app/buzz/posts/page.tsx` - 投稿管理ページ作成
- `/app/settings/page.tsx` - 設定ページ作成
- `/app/analytics/page.tsx` - 分析ダッシュボード作成

#### 2. UIコンポーネントの実装
- **shadcn/ui統合**: 全コンポーネントを作成
  - button, card, dialog, dropdown-menu, input, label
  - navigation-menu, scroll-area, select, separator
  - switch, tabs, textarea, badge
- **必要な依存関係インストール**:
  - class-variance-authority
  - @radix-ui/react-label
  - @radix-ui/react-icons

#### 3. データベーススキーマ対応
- **ViralPostPerformance**: one-to-one relationへの対応
  - `performance[0]` → `performance`への修正
  - `timeframe`フィールドの削除（30m, 1h, 24h固定フィールド使用）
- **クエリの修正**:
  - `performance: { some: {...} }` → `performance: { field: value }`
  - `draft` → `opportunity`への参照変更

#### 4. APIエンドポイントの追加
- `/api/dashboard/stats` - ダッシュボード統計API
- `/api/analytics/insights` - 分析インサイトAPI  
- `/api/cron/collect-performance` - パフォーマンス収集Cron
- `/api/viral/cot-session/[sessionId]/drafts` - 下書き管理API

#### 5. テスト結果
- **CoT生成テスト**: 成功（3つの下書き生成確認）
- **ビルドテスト**: 成功（全TypeScriptエラー解消）
- **デプロイ**: GitHub pushまで完了（commit: 98af2f1）

### 残課題と注意事項

#### Twitter API制限への対応
- **ユーザーフィードバック**: 「metricsの制限がある場合は、KaitoAPI使うといいですよ。もう実装されてるので。Apify。」
- Kaito API (Apify)は既に実装済み
- `/api/cron/collect-performance`で必要に応じて切り替え可能

#### 次セッションへの引き継ぎ事項
1. **Vercelデプロイ確認**
   - デプロイ状況の確認（https://x-buzz-flow.vercel.app）
   - 環境変数の動作確認
   - エラーログの確認

2. **機能テスト優先順位**
   - CoT生成フロー（「AIと働き方」でテスト）
   - 下書き編集・投稿機能
   - パフォーマンストラッキング
   - スケジュール投稿（Vercel Cron）

3. **パフォーマンス収集の改善**
   - Twitter API制限時のKaito API自動切り替え
   - エラーハンドリングの強化

4. **A/Bテスト機能**（低優先度）
   - UI実装は保留中
   - APIは実装済み（`/api/viral/ab-test/generate`）

## 2025年6月14日の作業完了報告

### 実施した作業
1. **DBテーブルの作成**
   - cot_sessionsとcot_draftsテーブルが存在しなかった問題を解決
   - カスタムスクリプトでテーブルとEnum型を作成
   - マイグレーションの問題（DIRECT_URLが未設定）を特定

2. **CoT APIの修正**
   - OpenAI APIのJSON形式エラーを修正
   - 各フェーズのプロンプトに「必ず以下のJSON形式で出力してください」を追加
   - Phase 2のIntegrateプロンプトに詳細なJSON構造を追加

3. **CLAUDE.mdの更新**
   - Orchestrated Chain of Thought実装の記載を追加
   - Response API廃止とGPT動的検索クエリ生成の実装を明記

4. **動作確認**
   - CoTセッション作成成功
   - Phase 1完了（THINK→EXECUTE→INTEGRATE）
   - 「AIと働き方」で動的検索クエリ生成・Google検索実行・機会特定まで確認

### 現在の状態
✅ **完了**:
- DBテーブル作成
- CoT Phase 1の完全動作
- 動的検索クエリ生成（ハードコード排除）
- Google Custom Search API統合

⚠️ **未確認**:
- Phase 2-5の完全動作
- 下書き作成機能
- Twitter投稿までの流れ

### 次回セッションへの引き継ぎ事項

1. **必須確認事項**
```bash
# セッションIDを使って処理を続行
curl -X POST http://localhost:3000/api/viral/cot-session/e07ccac8-c46f-423c-92f9-a8c4ef7adb1e/process
# Phase 2-5まで実行して下書きが作成されるか確認
```

2. **残タスク**
   - Phase 2-5の動作確認
   - 生成された下書きの確認（/viral/drafts）
   - 下書きからTwitter投稿までの流れ確認
   - ニュースコメント付きRT機能の実装
   - 今日の10大ニュース機能の実装
   - バズ投稿へのクイック反応機能
   - スケジューラーとの統合

3. **重要な注意事項**
   - サーバー再起動時: 既存プロセスをkillしてから起動
   - DB接続: DIRECT_URLとDATABASE_URL両方が.envと.env.localに必要
   - 検索クエリ: 絶対にハードコードしない（動的生成を維持）
   - JSON形式: OpenAI APIコール時は必ずプロンプトに「JSON」を含める

4. **技術的な状態**
   - Next.js開発サーバー: http://localhost:3000
   - Prisma Studio: http://localhost:5555
   - 環境変数: すべて設定済み（Google Search Engine ID含む）
   - 最新セッションID: e07ccac8-c46f-423c-92f9-a8c4ef7adb1e

### 新機能実装
1. **A/Bテスト機能**
   - `/app/api/viral/ab-test/generate/`
   - コンテンツバリエーション生成

2. **スケジュール投稿Cron**
   - `/app/api/cron/scheduled-posts/`
   - Vercel Cron対応（maxDuration: 60秒）
   - CRON_SECRET認証

3. **パフォーマンストラッキング強化**
   - 30分、1時間、24時間後の自動計測

### テストエンドポイント追加
- 各種Web検索テスト用API
- JSON形式検証用エンドポイント
- ライブサーチテスト

### ドキュメント追加
- `/docs/step1-two-phase-implementation.md`
- `/docs/deployment-session-20250613.md`
- `/docs/deployment-session-20250613-v2.md`

## 環境変数設定メモ

### Google Custom Search API（設定済み）
```bash
# .env.localに追加
GOOGLE_API_KEY=AIzaSy... # 実際のキーは.env.localで管理
GOOGLE_SEARCH_ENGINE_ID= # 要設定：https://programmablesearchengine.google.com/で作成
```

**重要**: 
- APIキーは絶対にコミットしない
- `.env.local`で管理（.gitignoreに含まれている）
- 検索エンジンIDはまだ未設定なので、Google Programmable Search Engineで作成が必要

## 連絡先・リポジトリ
- GitHub: https://github.com/Opi-jp/X_BUZZ_FLOW
- Vercel: https://x-buzz-flow.vercel.app

## 次セッションへの重要な引き継ぎ指示

### 1. 作業開始時の確認事項
```bash
# 作業ログの開始（最初に必ず実行）
cd /Users/yukio/X_BUZZ_FLOW
./scripts/auto_log_updater.sh

# Vercelデプロイ状況の確認
vercel logs --follow

# 開発サーバーの起動
npm run dev

# Prisma Studioの起動（別ターミナル）
npx prisma studio
```

### 2. 優先実施事項
1. **Vercelデプロイの動作確認**
   - https://x-buzz-flow.vercel.app へアクセス
   - Function Logsでエラーチェック
   - 環境変数の動作確認（特にGoogle Search API）

2. **CoT生成フローの本番テスト**
   - `/viral/cot`から新規セッション作成
   - 「AIと働き方」でテスト実行
   - Phase 1-5の完了と下書き生成を確認

3. **Twitter投稿機能の確認**
   - 下書きから「今すぐ投稿」をテスト
   - スケジュール投稿の設定確認
   - Kaito APIでのメトリクス取得確認

### 3. 技術的注意事項
- **データベース**: ViralPostPerformanceはone-to-one relation
- **API制限**: Twitter APIメトリクス制限時はKaito APIを使用
- **JSON形式**: OpenAI APIコール時は必ずプロンプトに「JSON」を含める
- **検索クエリ**: 動的生成を維持（ハードコード厳禁）

### 4. 未完了タスク
- A/Bテスト機能のUI実装
- パフォーマンストラッキングの自動切り替え機能
- ニュースコメント付きRT機能
- 今日の10大ニュース機能
- バズ投稿へのクイック反応機能

---
*最終更新: 2025/06/14 18:00*