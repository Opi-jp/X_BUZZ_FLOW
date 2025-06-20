# Twitter OAuth 2.0 設定ガイド

## 🚨 現在の問題
- Client ID/Secret が正しくない
- Callback URL が一致していない  
- 必要なスコープが許可されていない
- Twitter Developerアプリの設定が不完全

## 📋 必要な設定手順

### 1. Twitter Developer Portal設定

**アクセス**: https://developer.twitter.com/en/portal/dashboard

#### App設定 (Essential)
```
App Name: X_BUZZ_FLOW
Description: AI活用型SNS運用支援システム
Website URL: https://x-buzz-flow.vercel.app
```

#### OAuth 2.0 Settings
```
Type: Web App, Automated App or Bot
Callback URLs: 
  - https://x-buzz-flow.vercel.app/api/auth/callback/twitter
  - http://localhost:3000/api/auth/callback/twitter (開発用)

Website URL: https://x-buzz-flow.vercel.app
Terms of Service: https://x-buzz-flow.vercel.app/terms (作成予定)
Privacy Policy: https://x-buzz-flow.vercel.app/privacy (作成予定)
```

#### App permissions
```
Read and Write permissions
✅ Tweet and Retweet
✅ Like and Unlike
✅ Read your account information
✅ Read and write your profile information
```

#### User authentication settings
```
OAuth 2.0: ✅ Enable
OAuth 1.0a: ❌ Disable (v2.0のみ使用)

Request email from users: ✅ Enable
```

### 2. 必要なスコープ設定

NextAuth設定で要求するスコープ:
```typescript
scope: 'tweet.read tweet.write users.read offline.access'
```

Twitter Developer Portalで許可が必要:
- `tweet.read` - ツイート読み取り
- `tweet.write` - ツイート投稿
- `users.read` - ユーザー情報読み取り  
- `offline.access` - リフレッシュトークン取得

### 3. 現在のコールバックURL

**本番環境**: `https://x-buzz-flow.vercel.app/api/auth/callback/twitter`
**開発環境**: `http://localhost:3000/api/auth/callback/twitter`

### 4. 取得が必要な値

Twitter Developer Portalから取得:
```
Client ID: [OAuth 2.0のClient ID]
Client Secret: [OAuth 2.0のClient Secret]
```

### 5. 現在の環境変数

```env
# 現在設定されている値（要確認）
TWITTER_CLIENT_ID=d09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ
TWITTER_CLIENT_SECRET=CKJQmYy5oqPNjOTm0NkltPcHxRA-fCaSVrtoVVcIO9VlTsS0Nn
```

## 🔧 修正手順

### Step 1: Twitter Developer Portal確認
1. https://developer.twitter.com/en/portal/dashboard にアクセス
2. 該当アプリを選択
3. 「Settings」タブで設定確認

### Step 2: OAuth 2.0設定の確認
1. 「User authentication settings」を編集
2. OAuth 2.0が有効か確認
3. Callback URLsに正しいURLが設定されているか確認
4. 必要なPermissionsが付与されているか確認

### Step 3: 新しい認証情報の取得
1. 「Keys and tokens」タブを開く
2. OAuth 2.0 Client IDとClient Secretを確認/再生成
3. 値をコピーして環境変数を更新

### Step 4: Vercel環境変数の更新
```bash
# Vercel管理画面で設定
NEXTAUTH_URL=https://x-buzz-flow.vercel.app
NEXTAUTH_SECRET=XL0TNCd0Mzqtn5F77CsIn1i2JOVGF8CoNHg9Ecl7A9I=
TWITTER_CLIENT_ID=[新しいClient ID]
TWITTER_CLIENT_SECRET=[新しいClient Secret]
```

## 🧪 テスト手順

### 1. 認証フローテスト
```bash
# 1. サインインページにアクセス
curl -I https://x-buzz-flow.vercel.app/auth/signin

# 2. Twitter認証URL確認
curl -s https://x-buzz-flow.vercel.app/api/auth/providers

# 3. 認証実行（ブラウザで手動テスト）
# https://x-buzz-flow.vercel.app/api/auth/signin/twitter
```

### 2. 認証成功後の確認事項
- ダッシュボードへのリダイレクト成功
- ユーザー情報の正常取得
- セッション情報の保存確認

## 🚨 よくあるエラーと解決策

### Error: invalid_client
- Client IDまたはClient Secretが間違っている
- OAuth 2.0が有効になっていない

### Error: redirect_uri_mismatch  
- Callback URLが一致していない
- Twitter Developer PortalとNextAuthの設定を再確認

### Error: access_denied
- 必要なPermissionが付与されていない
- Scopeの設定を確認

### Error: unauthorized_client
- アプリの承認プロセスが未完了
- App detailsの入力が不完全

---
*作成日: 2025/06/15*
*対象: X_BUZZ_FLOW Twitter OAuth 2.0 設定*