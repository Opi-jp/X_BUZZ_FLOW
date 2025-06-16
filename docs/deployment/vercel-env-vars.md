# Vercel環境変数設定ガイド

以下の環境変数をVercelのダッシュボードで設定してください。

## 必須環境変数

### データベース
```
DATABASE_URL=postgresql://postgres.atyvtqorzthnszyulquu:Yusuke0508@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10
```

### NextAuth
```
NEXTAUTH_URL=https://x-buzz-flow.vercel.app
NEXTAUTH_SECRET=[生成した秘密鍵]
```

**NEXTAUTH_SECRETの生成方法:**
```bash
openssl rand -base64 32
```

### Twitter OAuth 2.0
```
TWITTER_CLIENT_ID=d09yVlhvZF9aMktXV25PSjRUeDU6MTpjaQ
TWITTER_CLIENT_SECRET=[.env.localから取得]
```

### AI APIs
```
OPENAI_API_KEY=[.env.localから取得]
CLAUDE_API_KEY=[.env.localから取得]
PERPLEXITY_API_KEY=[.env.localから取得]
```

### Google Search API
```
GOOGLE_API_KEY=[.env.localから取得]
GOOGLE_SEARCH_ENGINE_ID=[Google Programmable Search Engineで作成]
```

### KaitoAPI
```
KAITO_API_KEY=[.env.localから取得]
```

### Vercel Cron
```
CRON_SECRET=[生成した秘密鍵]
```

**CRON_SECRETの生成方法:**
```bash
openssl rand -hex 32
```

## オプション環境変数

### Twitter API (投稿用)
```
TWITTER_API_KEY=[Twitter Developer Portalから取得]
TWITTER_API_SECRET=[Twitter Developer Portalから取得]
TWITTER_ACCESS_TOKEN=[Twitter Developer Portalから取得]
TWITTER_ACCESS_SECRET=[Twitter Developer Portalから取得]
```

## 設定手順

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 各環境変数を追加
5. すべての環境（Production, Preview, Development）に適用

## 注意事項

- APIキーは絶対に公開しない
- NEXTAUTH_URLは本番環境のURLに設定
- GOOGLE_SEARCH_ENGINE_IDはまだ未設定の場合、[こちら](https://programmablesearchengine.google.com/)で作成
- Twitter API認証情報は投稿機能を使用する場合のみ必要

## デプロイ後の確認

1. `/api/health` エンドポイントでAPIの接続確認
2. サインイン機能の動作確認
3. Cronジョブの実行ログ確認