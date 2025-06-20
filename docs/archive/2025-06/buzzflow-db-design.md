# BuzzFlow データベース設計

## 1. PostgreSQL（構造化データ）

### buzz_posts（バズ投稿）
```sql
- id: UUID (PK)
- post_id: String (X/Twitter ID)
- content: Text
- author_username: String
- author_id: String
- likes_count: Integer
- retweets_count: Integer
- replies_count: Integer
- impressions_count: Integer
- posted_at: Timestamp
- collected_at: Timestamp
- url: String
- theme: String (収集時のテーマ/キーワード)
- language: String
- media_urls: JSON (画像/動画URL配列)
- hashtags: JSON (ハッシュタグ配列)
- chroma_id: String (ChromaDB参照用)
```

### scheduled_posts（予定投稿）
```sql
- id: UUID (PK)
- content: Text
- scheduled_time: Timestamp
- status: Enum (draft/scheduled/posted/failed)
- post_type: Enum (new/retweet/quote)
- ref_post_id: UUID (FK → buzz_posts)
- template_type: String (共感型/警告型/ユーモア型など)
- ai_generated: Boolean
- ai_prompt: Text (使用したプロンプト)
- edited_content: Text (編集後の内容)
- posted_at: Timestamp
- post_result: JSON (投稿結果データ)
```

### post_analytics（投稿分析）
```sql
- id: UUID (PK)
- scheduled_post_id: UUID (FK)
- impressions: Integer
- likes: Integer
- retweets: Integer
- replies: Integer
- profile_clicks: Integer
- link_clicks: Integer
- measured_at: Timestamp
- engagement_rate: Float
- ai_analysis: Text (Claude分析コメント)
```

### ai_patterns（AI生成パターン）
```sql
- id: UUID (PK)
- name: String
- description: Text
- prompt_template: Text
- example_output: Text
- success_rate: Float
- usage_count: Integer
- created_at: Timestamp
```

## 2. ChromaDB（ベクトルDB + 知識グラフ）

### コレクション設計

#### buzz_embeddings（投稿埋め込み）
```python
{
  "id": "postgres_buzz_post_id",
  "embedding": vector,
  "metadata": {
    "content": "投稿内容",
    "author": "作者名",
    "engagement_score": "エンゲージメント率",
    "posted_at": "投稿日時",
    "theme": "テーマ",
    "hashtags": ["tag1", "tag2"],
    "post_type": "original/reply/quote"
  }
}
```

#### author_relationships（作者関係性）
```python
{
  "id": "relationship_id",
  "embedding": vector,
  "metadata": {
    "source_author": "作者A",
    "target_author": "作者B",
    "relationship_type": "retweet/reply/quote/mention",
    "interaction_count": 10,
    "topics": ["共通話題1", "共通話題2"]
  }
}
```

#### topic_evolution（トピック進化）
```python
{
  "id": "topic_chain_id",
  "embedding": vector,
  "metadata": {
    "parent_topic": "元トピック",
    "child_topic": "派生トピック",
    "evolution_type": "expansion/variation/contrast",
    "timespan": "2024-01-01 to 2024-01-07",
    "key_posts": ["post_id1", "post_id2"]
  }
}
```

#### content_patterns（コンテンツパターン）
```python
{
  "id": "pattern_id",
  "embedding": vector,
  "metadata": {
    "pattern_name": "異常値導入型",
    "success_rate": 0.75,
    "avg_engagement": 5000,
    "example_posts": ["post_id1", "post_id2"],
    "key_elements": ["要素1", "要素2"]
  }
}
```

## 3. データフロー設計

### 収集→保存フロー
1. Kaito API → PostgreSQL (buzz_posts)
2. 投稿内容 → ChromaDB埋め込み生成 → buzz_embeddings
3. 関係性抽出 → author_relationships更新

### 分析→生成フロー
1. ChromaDBで類似投稿検索
2. パターン分析 → content_patterns参照
3. Claude API → 新規投稿生成
4. PostgreSQL (scheduled_posts) 保存

### 知識グラフ活用
- 作者ネットワーク分析
- トピック伝播経路追跡
- バズパターンの系譜分析
- インフルエンサー発見

## 4. インデックス戦略

### PostgreSQL
- buzz_posts: (posted_at, theme), (author_id), (likes_count DESC)
- scheduled_posts: (scheduled_time, status)
- post_analytics: (scheduled_post_id, measured_at)

### ChromaDB
- デフォルトのベクトル類似性インデックス
- メタデータフィルタリング用インデックス