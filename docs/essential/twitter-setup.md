# Twitter OAuth 2.0 設定手順

## 1. Twitter Developer Portalでの設定

1. [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) にアクセス
2. アプリを選択（または新規作成）
3. 「User authentication settings」を設定

### OAuth 2.0 設定
- **App permissions**: Read and write
- **Type of App**: Web App
- **Callback URI / Redirect URL**: 
  - 開発環境: `http://localhost:3000/api/auth/callback/twitter`
  - 本番環境: `https://x-buzz-flow.vercel.app/api/auth/callback/twitter`
- **Website URL**: `https://x-buzz-flow.vercel.app`

### 必要なスコープ
- `tweet.read`
- `tweet.write`
- `users.read`
- `offline.access`

## 2. 環境変数の設定

### ローカル開発環境 (.env.local)
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
```

### 本番環境 (Vercel)
Vercelのダッシュボードで以下の環境変数を設定：
```bash
NEXTAUTH_URL=https://x-buzz-flow.vercel.app
NEXTAUTH_SECRET=your-secret-here
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
```

## 3. 認証フロー

1. ユーザーが「Twitterでログイン」をクリック
2. Twitter OAuth画面にリダイレクト
3. ユーザーが認証を承認
4. コールバックURLにリダイレクト
5. アクセストークンを取得してDBに保存
6. セッションを作成

## トラブルシューティング

### 「Callback URL not approved」エラー
- Twitter Developer Portalで正しいコールバックURLが設定されているか確認
- HTTPSとHTTPの違いに注意
- 末尾のスラッシュの有無に注意

### セッションが保持されない
- `NEXTAUTH_SECRET`が設定されているか確認
- 本番環境では`NEXTAUTH_URL`が正しく設定されているか確認
- Cookieの設定を確認（特にsecure属性）

### アクセストークンエラー
- スコープが正しく設定されているか確認
- トークンの有効期限を確認
- リフレッシュトークンの実装を検討