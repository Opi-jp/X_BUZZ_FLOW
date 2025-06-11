# BuzzFlow クイックスタートガイド

## VS Code復旧時の手順

### 1. 環境変数の確認
```bash
# .env.localファイルに以下が設定されているか確認
CLAUDE_API_KEY=
PERPLEXITY_API_KEY=
KAITO_API_KEY=
DATABASE_URL=
DIRECT_URL=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. データベース接続確認
```bash
npx prisma generate
npx prisma db push
```

### 4. 開発サーバー起動
```bash
npm run dev
```

### 5. 主要な作業フロー

#### モーニングルーティン（5分）
1. http://localhost:3000 にアクセス
2. 「ワンクリック朝の準備」をクリック
3. 生成された投稿計画を確認
4. 必要に応じて編集してスケジュール

#### データ収集
- バズツイート: `/collect` ページ
- ニュース: 自動収集（毎朝6時）

#### 投稿作成
- `/create` ページでAI生成
- Perplexityトレンドを参考に

### 6. 最新の実装状況

#### ✅ 実装済み
- Perplexity統合（トレンド分析）
- 投稿計画自動生成
- スケジュール管理
- 成功分析レポート

#### ⚠️ 手動実行が必要
- バズツイート収集
- 実際の投稿（自動投稿は未実装）

### 7. トラブルシューティング

#### DB接続エラー
→ `/docs/essential/database-access.md` 参照

#### Twitter認証エラー
→ `/docs/essential/twitter-setup.md` 参照

#### Perplexity API
→ `/docs/essential/perplexity-implementation-summary.md` 参照

### 8. 開発時の注意点
- Supabaseは東京リージョン使用
- 開発環境ではDIRECT_URL使用
- TypeScriptの厳密モード有効