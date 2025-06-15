# NextAuth 400エラー詳細診断

## 🚨 現在の問題

- **NextAuth providers**: ✅ 正常表示
- **NextAuth signin endpoint**: ❌ HTTP 400
- **認証後のリダイレクト**: ❌ signin に戻る

## 🔍 可能性のある原因

### 1. NEXTAUTH_SECRET設定問題
Vercel環境でNEXTAUTH_SECRETが正しく設定されていない

### 2. NEXTAUTH_URL設定問題
- ローカル: `http://localhost:3000`
- 本番: `https://x-buzz-flow.vercel.app`
の不整合

### 3. Next.js 15互換性問題
NextAuth と Next.js 15 の互換性問題

### 4. Twitter Provider設定問題
OAuth 2.0設定が NextAuth で正しく動作していない

## 📋 確認事項

### Vercel環境変数設定
```
NEXTAUTH_URL=https://x-buzz-flow.vercel.app
NEXTAUTH_SECRET=XL0TNCd0Mzqtn5F77CsIn1i2JOVGF8CoNHg9Ecl7A9I=
TWITTER_CLIENT_ID=d09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ
TWITTER_CLIENT_SECRET=ADVu9Ngy6vTOiTj_EFLz-G9kQISEge2JJ8kcJX0c_lbwVcJFP3
```

### NextAuth route handler確認
`/app/api/auth/[...nextauth]/route.ts` の設定

## 🔧 解決策

### Option 1: NextAuth設定の簡略化
最小限の設定でテスト

### Option 2: NextAuth debug mode有効化
詳細なエラーログ出力

### Option 3: Twitter Provider設定変更
OAuth 1.0a に一時切り替え

### Option 4: 環境変数の再設定
Vercel環境変数の完全な再設定

## 🧪 テスト方法

### 1. ローカル環境でのテスト
```bash
npm run dev
# http://localhost:3000/api/auth/signin/twitter
```

### 2. 環境変数ダンプ
```bash
curl https://x-buzz-flow.vercel.app/api/auth/debug
```

### 3. NextAuth version確認
package.json でNextAuthのバージョン確認

---
*NextAuth 400エラーの根本解決が必要*