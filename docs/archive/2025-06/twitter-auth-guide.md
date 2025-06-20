# Twitter API認証問題の解決ガイド

## 現在の問題
- 401 Unauthorized エラー
- Access TokenまたはAccess Token Secretが無効

## 解決手順

### 1. Twitter Developer Portalでの確認事項

1. **https://developer.twitter.com/en/portal/dashboard** にアクセス
2. **アプリケーションを選択**
3. **Keys and Tokens**タブで以下を確認：

#### API Key & Secret
- API Key: `CYXHe62d5Yl0rlSmZezaw1SjP`
- API Secret: `lkTMV179YR1OunMFxPLH1QLQWYpZWDmq4Cdi43rTdKuRhDFnRa`

#### Access Token & Secret（要再生成）
- 現在のAccess Token: `5209331-jsSdW58klCoWVA6cu7yVf1l0Q5AIXc9vff5KDn4gM5`
- 現在のAccess Secret: `Oc3NvZ4QqZg1u8QdVrv6KQfqrCuAQze3PxdUOdYpiN9rY`

### 2. 権限設定の確認

**App permissions**セクションで以下を確認：
- ✅ **Read and write** （投稿に必要）
- ❌ Read only （投稿できない）

### 3. 認証情報の再生成手順

1. **Access Token & Secret**セクションで：
   - **Regenerate**ボタンをクリック
   - 新しいAccess TokenとAccess Secretを取得
   
2. **必要に応じてAPI Key & Secretも再生成**

### 4. 環境変数の更新

新しい認証情報を取得後、以下のファイルを更新：

```bash
# .env.local
TWITTER_API_KEY=新しいAPI_KEY
TWITTER_API_SECRET=新しいAPI_SECRET  
TWITTER_ACCESS_TOKEN=新しいACCESS_TOKEN
TWITTER_ACCESS_SECRET=新しいACCESS_SECRET
```

### 5. テスト実行

```bash
# 認証テスト
node debug-twitter-credentials.js

# 実際の投稿テスト
node test-twitter-complete.js
```

## 一般的な401エラーの原因

1. **Access Tokenの期限切れ**
2. **権限設定が不適切**（Read onlyになっている）
3. **アプリケーションがsuspendされている**
4. **認証情報の入力ミス**

## 次のステップ

1. Developer Portalでの権限確認
2. Access Token & Secretの再生成
3. 環境変数の更新
4. 認証テストの再実行