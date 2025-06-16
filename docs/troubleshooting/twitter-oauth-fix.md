# Twitter OAuth 2.0 設定修正手順

## 1. Twitter Developer Portalでの設定

### User authentication settingsで設定すべき内容：

#### App permissions
- ✅ **Read and write** を選択

#### Type of App
- ✅ **Web App, Automated App or Bot** を選択

#### App info
**Callback URI / Redirect URL** (両方とも追加):
```
http://localhost:3000/api/auth/callback/twitter
https://x-buzz-flow.vercel.app/api/auth/callback/twitter
```

**Website URL**:
```
https://x-buzz-flow.vercel.app
```

**Terms of service** (オプション):
```
https://x-buzz-flow.vercel.app/terms
```

**Privacy policy** (オプション):
```
https://x-buzz-flow.vercel.app/privacy
```

### 重要: 設定後は必ず「Save」ボタンをクリック

## 2. 環境変数の確認

### ローカル (.env.local)
```env
TWITTER_CLIENT_ID=d09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ
TWITTER_CLIENT_SECRET=ADVu9Ngy6vTOiTj_EFLz-G9kQISEge2JJ8kcJX0c_lbwVcJFP3
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=XL0TNCd0Mzqtn5F77CsIn1i2JOVGF8CoNHg9Ecl7A9I=
```

### Vercel環境変数
同じ値を設定（NEXTAUTH_URLは `https://x-buzz-flow.vercel.app`）

## 3. デバッグ手順

1. サーバーを再起動
```bash
# 既存プロセスを終了
lsof -ti:3000 | xargs kill -9

# 再起動
npm run dev
```

2. ブラウザのキャッシュをクリア（シークレットモードで試す）

3. http://localhost:3000/auth/signin でテスト

## 4. エラーが続く場合

### "Access Denied" エラーの場合：
- Twitter Developer Portalで設定が保存されているか確認
- 5-10分待ってから再試行（Twitter側の反映に時間がかかる場合がある）

### それでも解決しない場合：
- 新しいTwitter Appを作成することを検討
- OAuth 1.0aに戻すことを検討