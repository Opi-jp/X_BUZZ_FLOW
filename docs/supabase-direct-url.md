# Supabase Direct Connection URLの取得方法

## 手順

1. **Supabaseダッシュボードにログイン**
   - https://supabase.com/dashboard

2. **プロジェクトを選択**
   - あなたのプロジェクト（qcbgpjeexmfqfekzvwkt）を選択

3. **左サイドバーから「Settings」をクリック**
   - 歯車アイコン（⚙️）

4. **「Database」タブを選択**
   - Settings内の上部タブから「Database」を選択

5. **「Connection string」セクションを探す**
   - ページを少しスクロールすると見つかります

6. **「Connection pooling」の下にある「Session pooler」と「Transaction pooler」の選択肢が表示される**

7. **その下に「Direct connection」というボタンまたはリンクがある**
   - クリックすると切り替わります

## URLの形式

### Transaction pooler（デフォルト）
```
postgresql://postgres.[プロジェクトID]:[パスワード]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

### Direct connection（必要なもの）
```
postgresql://postgres.[プロジェクトID]:[パスワード]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

## 見分け方
- **Transaction pooler**: ポート番号が `6543`
- **Direct connection**: ポート番号が `5432`

## Vercelに設定する際の注意点

1. VercelのEnvironment Variablesに移動
2. `DIRECT_URL`という名前で新しい環境変数を作成
3. Direct connectionのURLをコピーして貼り付け
4. すべての環境（Production, Preview, Development）にチェック
5. 保存して再デプロイ

## 確認方法
```bash
# ローカルで確認
echo $DIRECT_URL

# Vercelで確認（デプロイ後）
curl https://x-buzz-flow.vercel.app/api/auth/debug
```