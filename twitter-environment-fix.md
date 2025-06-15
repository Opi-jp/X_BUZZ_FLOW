# Twitter App Environment設定の確認

## 🚨 現在の問題

**Environment: Development**になっているのが原因の可能性があります。

## 🔧 確認・修正手順

### 1. Environment設定の確認

Twitter Developer Portalで：

**App settings → Environment**
- **Development** → 制限あり
- **Production** → 制限なし

### 2. Development環境の制限

Development環境では：
- 認証フローに制限がある場合があります
- 外部URLでの認証が制限される場合があります

### 3. Production環境への変更

**方法1: Environment変更**
1. App settings
2. Environment → **Production**に変更
3. 必要な追加情報を入力

**方法2: 新しいProduction Appの作成**
1. 新しいAppを作成
2. Environment: **Production**
3. 同じ設定を適用

### 4. 他の確認項目

**User authentication settings保存確認:**
1. 設定画面で「Save」をクリック済みか？
2. 設定変更が反映されているか？
3. Page refreshして確認

**App status確認:**
1. App overview
2. Status: **Active** (Pending/Under reviewではない)

### 5. 即座に試すべき対応

**Step 1: 設定保存の再確認**
- User authentication settingsで「Save」を再度クリック
- Page refreshして設定が残っているか確認

**Step 2: Environment変更**
- Development → Production に変更

**Step 3: App permissions再確認**
- Read and write が確実に保存されているか

## 🧪 テスト用の別のCallback URL

localhostでのテストも試してみます：

```bash
curl -I "https://api.twitter.com/2/oauth2/authorize?response_type=code&client_id=d09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Ftwitter&scope=tweet.read%20tweet.write%20users.read%20offline.access"
```

Development環境ではlocalhostのみ許可される場合があります。

---
*診断: Environment設定要確認*