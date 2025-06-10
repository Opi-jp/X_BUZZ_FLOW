# BuzzFlow 作業記録

## 2025/01/10 作業内容 (続き)

### 完了タスク

1. **プロジェクト初期設定**
   - GitHubリポジトリ作成: https://github.com/Opi-jp/X_BUZZ_FLOW
   - Next.js 15.3.3 セットアップ（TypeScript, Tailwind CSS v4）
   - Vercelデプロイ完了: https://vercel.com/yukio-ohyas-projects/x-buzz-flow

2. **環境変数設定**
   - Claude API Key: 設定済み
   - Kaito API Key (Apify): 設定済み
   - Database URL: 設定済み（Supabase）
   - Vercel環境変数に全て登録済み

3. **データベース設計・構築**
   - Supabase無料プランでプロジェクト作成（東京リージョン）
   - Prismaスキーマ定義完了
     - buzz_posts: バズ投稿データ
     - scheduled_posts: 予定投稿
     - post_analytics: 投稿分析
     - ai_patterns: AI生成パターン
   - マイグレーション実行済み（初期スキーマ反映）

### 技術選定

- **Frontend**: Next.js App Router + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: 
  - PostgreSQL (Supabase) - 構造化データ用
  - ChromaDB（予定） - ベクトル検索・知識グラフ用
- **ORM**: Prisma（oya-fukou-webのMongooseから変更）

### 完了したAPIエンドポイント

1. **バズ投稿管理 (/api/buzz-posts)**
   - GET: 一覧取得（テーマ、ページネーション対応）
   - POST: 新規投稿作成（Kaito APIから取得したデータ保存用）
   - GET/DELETE (/[id]): 個別取得・削除

2. **予定投稿管理 (/api/scheduled-posts)**
   - GET: 一覧取得（ステータスフィルタ、ページネーション対応）
   - POST: 新規作成
   - GET/PATCH/DELETE (/[id]): 個別操作

3. **投稿収集 (/api/collect)**
   - POST: Kaito API（Apify）を使用してバズ投稿を収集

4. **AI文案生成 (/api/generate)**
   - POST: Claude APIを使用して投稿文案を生成
   - AIパターンや参照投稿を基に生成

5. **分析データ (/api/analytics)**
   - POST: 投稿パフォーマンスデータ作成
   - GET: 期間指定での分析サマリー取得

6. **AIパターン管理 (/api/ai-patterns)**
   - GET: パターン一覧取得
   - POST: 新規パターン作成

### APIテスト結果（2025/01/10更新）

- ✅ バズ投稿管理API: 正常動作
- ✅ 予定投稿管理API: 正常動作
- ✅ AIパターン管理API: 正常動作
- ✅ Claude API連携: 正常動作（新しいAPIキーで解決）
- ❓ Kaito API連携: 未テスト（Apify APIを使用）

### 開発環境での注意点

- Supabaseのpgbouncerで接続エラーが発生したため、開発環境では直接接続を使用
- 本番環境（Vercel）では引き続きTransaction Poolerを使用

### 完了したUIページ

1. **ダッシュボード** (/dashboard)
   - 統計情報の概要表示
   - 直近のパフォーマンス表示

2. **バズ投稿一覧** (/posts)
   - 収集した投稿の表示
   - テーマでフィルタリング
   - 投稿から直接AI生成へ

3. **投稿収集** (/collect)
   - Kaito API連携
   - クエリ・条件指定で収集

4. **投稿作成** (/create)
   - AI文案生成（Claude API）
   - パターン選択
   - 編集・スケジュール設定

5. **スケジュール管理** (/schedule)
   - 予定投稿の一覧・管理
   - ステータス変更
   - 編集・削除

6. **分析** (/analytics)
   - パフォーマンス統計
   - 期間別分析
   - エンゲージメント率表示

7. **AIパターン管理** (/patterns)
   - パターンの作成・管理
   - 使用回数・成功率表示

### X (Twitter) OAuth実装

- NextAuth.jsを使用したOAuth 2.0認証
- ユーザー情報とアクセストークンをDBに保存
- twitter-api-v2を使用した投稿機能
- スケジュール画面から直接投稿可能

### 必要な設定

1. Twitter Developer Portalでアプリ作成
2. OAuth 2.0を有効化
3. Callback URL設定:
   - 開発: http://localhost:3000/api/auth/callback/twitter
   - 本番: https://your-domain/api/auth/callback/twitter
4. 環境変数設定:
   - TWITTER_CLIENT_ID
   - TWITTER_CLIENT_SECRET

### 次のステップ

1. Twitter Developer設定の完了
2. ChromaDB接続設定とベクトル検索実装
3. 定期実行ジョブの設定
4. 本番環境でのテスト

### メモ

- Supabaseは Transaction pooler を使用（Vercel環境に最適）
- DIRECT_URLも設定してマイグレーション実行可能に
- Prismaのoutputを`app/generated/prisma`に設定

## 2025/01/10 追加作業

### OAuth認証の修正
- Twitter OAuth認証のループ問題を解決
- SessionProviderを追加
- 認証ミドルウェアを実装
- ログイン成功を確認

### 過去ツイートインポート機能
- Kaito APIを使用した過去ツイート収集
- 投稿収集ページに「ユーザータイムライン」モード追加
- 自分のアカウントの過去投稿を分析データとして保存

### 分析ページの機能強化
- 各メトリクス（インプレッション、いいね、RT、エンゲージメント率）でソート機能追加
- 昇順/降順の切り替え
- ソート状態の視覚的表示

### バズ投稿の日別管理
- 日別表示モードを追加
- 収集日（JST）でグループ化
- 日付セレクターで特定日のみ表示
- 各日付の投稿数表示

### AIニュース自動ツリー投稿システム（Phase 1完了）

#### データベース設計
- NewsSource: ニュースソース管理
- NewsArticle: 収集した記事
- NewsThread: ツリー投稿管理
- NewsThreadItem: 各ツイート

#### 登録済みニュースソース
**企業ブログ・公式**
- Anthropic Blog (RSS)
- OpenAI Blog (RSS)
- Google AI Blog (RSS)
- DeepMind Blog (RSS)
- Microsoft AI Blog (RSS)
- Hugging Face Blog (RSS)

**研究機関**
- MIT News - AI (RSS)
- Stanford AI Lab (RSS)

**テックメディア**
- TechCrunch AI (RSS)
- VentureBeat AI (RSS)
- The Verge AI (RSS)
- AI新聞 (RSS)

**Twitterアカウント**
- @AnthropicAI
- @OpenAI
- @GoogleAI
- @ycombinator
- @sama (Sam Altman)
- @DarioAmodei
- @ylecun (Yann LeCun)
- @AndrewYNg

#### 実装済み機能
- NewsAPI連携（AIニュース収集）
- Twitter収集（Kaito API使用）
- ニュース管理UI（/news）
- ソース管理機能
- 日付フィルター

#### 環境変数追加
- NEWSAPI_KEY: NewsAPIのAPIキー

### AIニュース自動ツリー投稿システム（Phase 2完了）

#### Phase 2 実装内容（2025/01/10 完了）

1. **記事分析・スコアリング機能 (/api/news/analyze)**
   - Claude APIを使用した記事の重要度分析（0-1スケール）
   - カテゴリ分類（research, product, business, regulation, opinion, other）
   - 日本語要約の自動生成
   - キーポイントの抽出
   - 影響度評価（low, medium, high）
   - バッチ分析機能（最大10件の一括処理）

2. **ツイート文自動生成機能 (/api/news/generate-thread)**
   - 重要度順にソートされた記事からスレッド生成
   - メインツイート + 個別ニュースツイートの構造
   - 日本語140文字制限を考慮したツイート生成
   - 絵文字を効果的に使用
   - NewsThreadとNewsThreadItemとしてDB保存
   - ソース多様性確保（同一ソースから最大2件まで）

3. **ニュース管理UIの機能拡張**
   - AI分析実行ボタンの追加（未処理記事数表示）
   - TOP10生成ボタンの追加
   - 分析結果の表示（重要度、日本語要約、キーポイント）
   - 処理済み/未処理の視覚的区別（黄色枠で未処理を強調）
   - スレッド生成結果のアラート表示

4. **収集機能の改善**
   - サンプル収集機能の追加（テスト用データ）
   - RSS収集（部分的に動作）
   - Twitter収集（Kaito API形式を修正）
   - 一括収集機能
   - collectingTypeでボタン状態を個別管理

5. **URLパラメータ状態管理**
   - 日付選択の状態をURLに保存
   - タブ切り替えの状態をURLに保存
   - ページ遷移後も状態を維持

#### 技術的な改善点
- Kaito APIのパラメータ形式を修正（searchTermsを配列として送信）
- Twitterユーザータイムライン収集をauthorモードに変更
- エラーメッセージの詳細化
- 48時間の時間範囲でTOP10を選出

### Phase 2 追加実装 (2025/01/11)

#### 実装内容
1. **スレッド生成数の柔軟化**
   - TOP 5-30まで選択可能なセレクター追加
   - 記事プールを最大100件まで拡大
   - ソース多様性制限を柔軟化

2. **記事選択チェックボックス機能**
   - 分析済み記事にチェックボックス追加
   - 全選択/全解除ボタン
   - 選択した記事を確実にスレッドに含める機能
   - 選択状態の表示とカウンター

3. **UI/UX改善**
   - テスト用ボタンの削除（サンプル収集、テスト）
   - 収集ボタンの整理と色統一

4. **セキュリティ対策**
   - robots.txt追加（全クローラー拒否）
   - metadataにrobots: noindex設定

#### Kaito APIエラー解決
- quackerからkaitoeasyapiに変更
- twitterContentパラメータ形式に修正
- 日付フィルター(since)の実装

### 今後の実装予定

#### Phase 3
- ツリー形式での自動投稿（Twitter API連携）
- スケジューラー実装（定期実行）
- エラーハンドリング強化

#### 未解決の問題
- ローカルOAuth認証のループ問題

### 技術的な解決事項
- Supabase pgbouncerとの互換性問題を解決
- Next.js 15の動的ルートパラメータ型エラーを修正
- useSearchParamsのSuspense boundary要件に対応
- Vercelビルドエラーの解決