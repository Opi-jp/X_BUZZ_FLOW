# Twitter OAuth 2.0 トラブルシューティング

## 現在の状況（2025年6月15日）

### ✅ 確認済み事項
1. **環境変数**: ローカル・Vercel両方で正しく設定
   - CLIENT_ID: `d09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ`
   - CLIENT_SECRET: 末尾`JFP3`で正しい
   - NEXTAUTH_URL: Vercelで`https://x-buzz-flow.vercel.app`

2. **NextAuth設定**: OAuth 2.0で正しく設定
   - version: "2.0"
   - scope: "users.read tweet.read tweet.write offline.access"
   - callback URL: 正しく設定

3. **エラー**: Access Denied（Twitter側で拒否）

## 解決策

### 方法1: Twitter Developer Portalでの再設定（推奨）

1. https://developer.twitter.com にアクセス
2. あなたのAppを選択
3. **User authentication settings**を開く
4. 以下を確認・修正：
   ```
   Type of App: Web App, Automated App or Bot
   App permissions: Read and write
   
   Callback URI / Redirect URL:
   - https://x-buzz-flow.vercel.app/api/auth/callback/twitter
   - http://localhost:3000/api/auth/callback/twitter
   
   Website URL: https://x-buzz-flow.vercel.app
   ```
5. **必ず「Save」ボタンをクリック**
6. **5-10分待ってから再試行**

### 方法2: 新しいTwitter Appの作成

現在のAppがうまく動作しない場合：

1. Twitter Developer Portalで新しいAppを作成
2. OAuth 2.0を有効化
3. 上記の設定を最初から行う
4. 新しいClient ID/Secretを.env.localとVercelに設定

### 方法3: OAuth 1.0aへの切り替え（最終手段）

```typescript
// lib/auth-options.ts
TwitterProvider({
  clientId: process.env.TWITTER_API_KEY || '',
  clientSecret: process.env.TWITTER_API_SECRET || '',
  version: '1.0',
})
```

環境変数を以下に変更：
```env
# .env.local
TWITTER_API_KEY=vlattMlII8Lz87FllcHH07R8M
TWITTER_API_SECRET=yq4di737XrSBKxaTqlBcDjEbT2uHhsXRO4PPsuddNDRDq4EnjO
```

## デバッグ用URL

- 本番環境テスト: https://x-buzz-flow.vercel.app/auth/signin
- 設定確認: https://x-buzz-flow.vercel.app/api/auth/check-config
- OAuth URL生成: https://x-buzz-flow.vercel.app/api/test-twitter-oauth

## よくある原因

1. **Twitter App設定の不完全な保存**
   - 設定変更後「Save」を押し忘れている
   - 設定が反映されるまで時間がかかる

2. **App環境の不一致**
   - Development/Production環境の混在
   - Standalone App設定の問題

3. **権限スコープの問題**
   - Required scopesが設定されていない
   - App permissionsが不適切

## 推奨アクション

1. まずTwitter Developer Portalで設定を再保存
2. 10分待つ
3. それでもダメなら新しいAppを作成