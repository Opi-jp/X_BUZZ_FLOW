# Supabase データベース管理機能ガイド

## 現在のBuzzFlowで活用できる機能

### 1. **Schema Visualizer** 
- データベースの構造を視覚的に確認
- テーブル間のリレーションを図で表示
- 現在のテーブル: buzz_posts, scheduled_posts, post_analytics, ai_patterns, users, sessions

### 2. **Tables**
- GUI上でデータの確認・編集・削除が可能
- SQLクエリを書かずにデータ操作できる
- フィルタリングやソート機能付き

### 3. **Functions** (ストアドプロシージャ)
- 複雑なビジネスロジックをDB側に実装可能
- 例: バズ投稿の自動分析関数、エンゲージメント率計算

### 4. **Triggers**
- データ変更時の自動処理
- 例: 投稿作成時に自動でanalyticsレコードを生成

### 5. **Access Control**
- **Roles**: ユーザー権限管理
- **Policies**: Row Level Security (RLS) - 行レベルのアクセス制御
  - 例: ユーザーは自分の投稿のみ編集可能

### 6. **Platform機能**
- **Backups**: 自動バックアップ（無料プランは7日間）
- **Migrations**: スキーマ変更の履歴管理
- **Webhooks**: データ変更時の外部通知

### 7. **Performance Tools**
- **Security Advisor**: セキュリティ診断
- **Performance Advisor**: パフォーマンス最適化提案
- **Query Performance**: 遅いクエリの特定

## BuzzFlowでの推奨設定

### セキュリティ強化
```sql
-- Row Level Securityを有効化（例: scheduled_posts）
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の投稿のみアクセス可能
CREATE POLICY "Users can only see their own posts" ON scheduled_posts
  FOR ALL USING (auth.uid() = user_id);
```

### パフォーマンス最適化
```sql
-- よく検索されるカラムにインデックスを作成
CREATE INDEX idx_buzz_posts_theme ON buzz_posts(theme);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
```

### 便利な関数の例
```sql
-- エンゲージメント率を計算する関数
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_likes INTEGER,
  p_retweets INTEGER,
  p_impressions INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  IF p_impressions = 0 THEN
    RETURN 0;
  END IF;
  RETURN ((p_likes + p_retweets) * 100.0) / p_impressions;
END;
$$ LANGUAGE plpgsql;
```

### トリガーの例
```sql
-- scheduled_postがPOSTEDになったら自動でanalyticsレコードを作成
CREATE OR REPLACE FUNCTION create_initial_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
    INSERT INTO post_analytics (
      scheduled_post_id,
      measured_at,
      impressions,
      likes,
      retweets,
      replies,
      engagement_rate
    ) VALUES (
      NEW.id,
      NOW(),
      0, 0, 0, 0, 0
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_analytics
AFTER UPDATE ON scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION create_initial_analytics();
```

## 注意事項

### 無料プランの制限
- データベースサイズ: 500MB
- バックアップ保持期間: 7日間
- 同時接続数: 60
- RLSポリシー数: 63個まで

### 推奨事項
1. 定期的にSchema Visualizerで構造を確認
2. Query Performanceで遅いクエリを監視
3. Security Advisorでセキュリティチェック
4. 重要なデータは定期的にバックアップ

## 次のステップ
1. Row Level Securityの実装
2. パフォーマンス用インデックスの追加
3. 自動化用のトリガー設定
4. バックアップ戦略の策定