# X_BUZZ_FLOW システムアーキテクチャ

## 概要
X_BUZZ_FLOWは、AI駆動のコンテンツ生成・投稿システムです。3つの独立したサブシステムから構成されています。

## 1. CoT (Chain of Thought) バイラルコンテンツ生成システム【新実装】

### 目的
Webトレンドを分析し、バズるコンテンツを自動生成・投稿

### 主要コンポーネント
- **Orchestrated CoT**: Think → Execute → Integrate の3段階処理
- **Google Custom Search API**: トレンド情報収集
- **GPT-4o**: コンテンツ生成
- **Claude**: 文体リライト（カスタマイズ可能）

### データベーステーブル
- `CotSession`: セッション管理
- `CotDraft`: 生成された下書き
- `GptAnalysis`: GPT分析結果（旧システムと共用）
- `ContentDraft`: コンテンツ下書き（旧システムと共用）

### APIエンドポイント
- `/api/viral/cot-session/*`: 新しいCoT実装
- `/api/viral/gpt-session/[sessionId]/step*`: 5段階処理（現行稼働中）
- `/api/cron/process-cot-sessions`: 自動実行用Cron

## 2. ニュース収集・引用コメントシステム【保持】

### 目的
ニュースを収集し、AIで分析してスレッド形式で投稿

### 主要コンポーネント
- **RSS/API収集**: 各種ニュースソースから記事収集
- **Claude分析**: 記事の重要度スコアリング
- **スレッド生成**: 複数ツイートの連続投稿

### データベーステーブル
- `NewsSource`: ニュースソース管理
- `NewsArticle`: 収集した記事
- `NewsAnalysis`: AI分析結果
- `NewsThread`: スレッド管理
- `NewsThreadItem`: 個別ツイート

### APIエンドポイント
- `/api/news/*`: ニュース関連全般
- `/api/news/collect/*`: 収集系
- `/api/news/analyze`: 分析
- `/api/news/generate-thread`: スレッド生成
- `/api/news/post-thread`: 投稿

### UI
- `/news`: ニュース管理画面
- `/news/threads`: スレッド管理画面

## 3. KaitoAPIバズ投稿収集・引用システム【保持】

### 目的
Twitter APIでは取得できないメトリクスを使用してバズ投稿を収集し、引用コメント

### 主要コンポーネント
- **KaitoAPI (Apify)**: メトリクス付きツイート収集
- **バズ判定**: エンゲージメント率によるフィルタリング
- **引用コメント**: バズ投稿への自動応答（開発中）

### データベーステーブル
- `BuzzPost`: 収集したバズ投稿
- `ScheduledPost`: スケジュール投稿（引用コメント含む）
- `PostAnalytics`: 投稿パフォーマンス分析

### APIエンドポイント
- `/api/collect`: KaitoAPI経由での収集
- `/api/viral/performance/*`: パフォーマンストラッキング

### UI（開発中）
- `/realtime`: リアルタイムバズモニタリング（未実装）

## システム統合方針

### 1. 独立性の維持
- 各システムは独立したデータモデルとAPIを持つ
- 相互干渉を避けるため、名前空間を分離

### 2. 共通基盤の活用
- 認証: NextAuth (Twitter OAuth)
- データベース: Prisma + PostgreSQL (Supabase)
- AI API: OpenAI, Anthropic Claude
- Twitter投稿: 共通のTwitterクライアント

### 3. UI統合
- トップナビゲーションで各システムへアクセス
- 統一されたデザインシステム（Tailwind CSS）

## 削除対象（整理済み）
- `/app/api/viral/gpt-session/[sessionId]/_archive/*`
- `/app/api/viral/gpt-session/[sessionId]/step1-collect`
- `/app/api/viral/gpt-session/[sessionId]/step1-analyze`
- テストスクリプト（`/test-scripts/`へ移動）

## 今後の開発方針

### Phase 1: 基盤整備【完了】
- [x] CoTシステムの実装
- [x] Claude文体リライト
- [x] Twitter投稿テスト

### Phase 2: UI統合【進行中】
- [ ] 統一ナビゲーション
- [ ] CoT専用UI
- [ ] ダッシュボード統合

### Phase 3: 機能拡張
- [ ] KaitoAPI引用コメント自動化
- [ ] スケジュール投稿の完全実装
- [ ] パフォーマンス分析ダッシュボード

## 環境変数

### 必須
```
# Database
DATABASE_URL=
DIRECT_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Twitter OAuth 2.0
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# AI APIs
OPENAI_API_KEY=
CLAUDE_API_KEY=
PERPLEXITY_API_KEY=

# Google Search
GOOGLE_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=

# KaitoAPI
KAITO_API_KEY=
```

## メンテナンス情報
- 最終更新: 2025/06/14
- メインメンテナー: 大屋友紀雄（@Opi）