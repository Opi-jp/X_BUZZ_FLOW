# NEWS×バイラルシステム統合設計

## 🎯 統合の目的

既存の**NEWSシステム**（記事収集・分析）と**V2バイラルシステム**（Perplexity→GPT→Claude）を統合し、**ニュース記事を素材とした高品質なバイラルコンテンツ生成**を実現する。

## 📊 現状の分析

### NEWSシステム（既存・完全動作）
- **記事収集**: RSS自動収集、日次で30-40件
- **AI分析**: Claude/GPTによる重要度スコア算出
- **管理機能**: 記事選択、スレッド生成、ソース管理
- **データ**: 過去7日間で76件、分析済み57件

### V2バイラルシステム（既存・完全動作）
- **3段階処理**: Perplexity→GPT→Claude
- **キャラクター生成**: カーディ・ダーレなど個性的な投稿
- **コンセプト生成**: 各トピックから5つずつ、計10個
- **下書き管理**: 編集・投稿・スケジュール機能

## 🔗 統合アーキテクチャ

### 新しいフロー: ニュースベースドバイラル生成

```
1. ニュース記事選択 (NEWS UI)
   ↓
2. V2セッション作成 (news-sourceフラグ付き)
   ↓
3. 記事コンテキスト注入 (Perplexityスキップ)
   ↓
4. GPTコンセプト生成 (記事ベース)
   ↓
5. Claudeキャラクター投稿生成
   ↓
6. 統合下書き管理
```

### データベース統合

#### 新テーブル: `news_viral_sessions`
```sql
CREATE TABLE news_viral_sessions (
  id TEXT PRIMARY KEY,
  v2_session_id TEXT NOT NULL,
  news_article_ids TEXT[] NOT NULL,
  theme TEXT NOT NULL,
  context_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (v2_session_id) REFERENCES v2_sessions(id)
);
```

#### 既存テーブル拡張: `v2_sessions`
```sql
ALTER TABLE v2_sessions 
ADD COLUMN source_type TEXT DEFAULT 'perplexity',
ADD COLUMN news_context JSONB;
```

### API統合

#### 新エンドポイント: `/api/viral/v2/news/to-viral`
```typescript
POST /api/viral/v2/news/to-viral
{
  "articleIds": ["article-1", "article-2"],
  "theme": "AIの働き方革命",
  "character": "cardi_dare",
  "platform": "Twitter"
}

Response:
{
  "sessionId": "session-uuid",
  "status": "created",
  "articlesCount": 2,
  "nextStep": "/viral/v2/sessions/{sessionId}"
}
```

#### 拡張エンドポイント: `/api/viral/v2/sessions/[id]/collect-topics`
```typescript
// ニュースベースの場合はPerplexity検索をスキップ
// 記事コンテンツから直接トピック抽出
```

### フロントエンド統合

#### NEWSページ (`/news`) 改修
```typescript
// 記事選択後の新ボタン
<button onClick={() => createViralFromNews(selectedArticles)}>
  バイラルコンテンツ生成 ({selectedArticles.size}件)
</button>
```

#### V2ダッシュボード (`/viral/v2`) 改修
```typescript
// セッション作成方法の選択
<div className="creation-options">
  <button>Perplexityで最新トレンド収集</button>
  <button>ニュース記事から生成</button>
</div>
```

## 🔧 実装ステップ

### Phase 1: データベース統合
1. **テーブル作成**: `news_viral_sessions`
2. **カラム追加**: `v2_sessions.source_type`, `news_context`
3. **リレーション設定**: 外部キー制約

### Phase 2: API統合
1. **新API作成**: `/api/viral/v2/news/to-viral`
2. **既存API拡張**: `collect-topics`でニュース対応
3. **コンテキスト注入**: 記事データをGPTプロンプトに組み込み

### Phase 3: フロントエンド統合
1. **NEWSページ改修**: バイラル生成ボタン追加
2. **V2ページ改修**: 作成方法選択UI
3. **ナビゲーション統合**: メニュー整理

### Phase 4: UX改善
1. **統合フロー**: シームレスな画面遷移
2. **プレビュー機能**: 生成前の記事要約表示
3. **履歴管理**: ニュース→バイラルの生成履歴

## 💡 期待される効果

### コンテンツ品質向上
- **具体性**: 実際のニュースに基づく具体的内容
- **信頼性**: 裏付けのある情報ベース
- **タイムリー性**: 最新ニュースの即座活用

### 運用効率向上
- **素材確保**: ニュース記事が常時素材として利用可能
- **工数削減**: Perplexity検索をスキップして高速生成
- **品質安定**: 事前分析済み記事による安定した入力

### 戦略的メリット
- **独自性**: 他にない「ニュース×キャラクター×バイラル」の組み合わせ
- **スケーラビリティ**: 記事収集の自動化により量産可能
- **差別化**: AIニュース分析に基づく高精度コンテンツ

## 🚧 技術的考慮事項

### パフォーマンス
- ニュース記事の内容量に応じたGPTトークン数調整
- 複数記事選択時の要約処理最適化

### データ整合性
- V2セッションとニュース記事の関連付け管理
- 記事削除時の関連セッション処理

### 拡張性
- 他の記事ソース（Twitter、Reddit等）への対応準備
- 記事以外のコンテンツソース（動画、画像等）への拡張可能性

## 📝 実装優先度

1. **高**: データベース統合とAPI作成
2. **中**: フロントエンド基本統合
3. **低**: UX改善と拡張機能

この統合により、X_BUZZ_FLOWは「ニュース収集→分析→バイラルコンテンツ生成→投稿」の完全自動化パイプラインを実現できます。