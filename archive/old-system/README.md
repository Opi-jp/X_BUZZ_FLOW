# 旧システムアーカイブ

このフォルダには、新しいバイラルコンテンツ自動生成システムへの移行に伴い、アーカイブされた旧システムのファイルが含まれています。

## アーカイブ日時
2024年6月12日

## アーカイブ内容

### Pages（旧UIページ）
- **dashboard/** - 初期ダッシュボード
- **dashboard-v2/** - 改良版ダッシュボード
- **schedule/** - スケジュール管理
- **patterns/** - AIパターン管理
- **create/** - 投稿作成ページ
- **analytics/** - 分析ページ
- **posts/** - 投稿一覧
- **collect/** - 収集ページ
- **settings/** - 設定ページ
- **data-status/** - データステータス

### API（旧APIエンドポイント）
- **ai-patterns/** - AIパターン管理API
- **scheduled-posts/** - 予定投稿管理
- **buzz-posts/** - バズ投稿管理
- **analytics/** - 分析API
- **auto-generate/** - 自動生成
- **watchlist/** - ウォッチリスト
- **twitter/** - Twitter投稿関連
- **post-tweet/** - ツイート投稿

### 参考用に流用可能なコード

#### AI生成ロジック
- `/api/generate/route.ts` - Claude APIを使った文案生成
- `/api/perplexity/trends/route.ts` - トレンド分析

#### データ収集
- `/api/collect/route.ts` - Kaito API連携
- `/api/news/collect-rss-v2/route.ts` - RSS収集
- `/api/news/analyze/route.ts` - ニュース分析

#### 統合ロジック
- `/api/briefing/morning/route.ts` - データ統合
- `/api/posting-plan/generate/route.ts` - 投稿計画生成

## 新システムへの移行

新システムでは以下の方針で開発を進めます：

1. **ChatGPT × Claude ハイブリッド**
   - ChatGPT: トレンド分析・戦略立案
   - Claude: コンテンツ生成・文案作成

2. **自動化の強化**
   - 30分ごとのトレンド監視
   - 自動投稿スケジューリング
   - パフォーマンス自動追跡

3. **シンプルなUI**
   - 必要最小限の管理画面
   - API中心のアーキテクチャ
   - 自動化による運用負荷軽減