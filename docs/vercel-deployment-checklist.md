# Vercelデプロイチェックリスト

## 1. 環境変数設定（Vercel管理画面）

以下の環境変数をVercelプロジェクトの設定で追加する必要があります：

### 必須の環境変数

```bash
# Database (Supabase) - PoolerとDirectの両方必要
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# OpenAI API（必須）
OPENAI_API_KEY="sk-..."

# Google Custom Search（必須）
GOOGLE_API_KEY="AIza..."
GOOGLE_SEARCH_ENGINE_ID="..."

# NextAuth（必須）
NEXTAUTH_URL="https://[your-app].vercel.app"  # 本番URLに変更
NEXTAUTH_SECRET="[32文字以上のランダム文字列]"

# Vercel Cron（必須）
CRON_SECRET="[ランダムな秘密鍵]"

# Twitter API v2（投稿機能を使う場合）
TWITTER_API_KEY=""
TWITTER_API_SECRET=""
TWITTER_ACCESS_TOKEN=""
TWITTER_ACCESS_SECRET=""
```

### オプションの環境変数

```bash
# その他のAI API
ANTHROPIC_API_KEY=""
PERPLEXITY_API_KEY=""
```

## 2. ビルド前の確認事項

### データベース
- [ ] Prismaスキーマがデプロイ環境と一致している
- [ ] `prisma generate`がpostinstallスクリプトに含まれている（✓）
- [ ] マイグレーションが最新状態

### API設定
- [ ] API routeのタイムアウト設定が適切（vercel.json）
- [ ] Cron jobsの設定が正しい（vercel.json）

### 依存関係
- [ ] すべての必要なパッケージがdependenciesに含まれている
- [ ] devDependenciesに本番で必要なものが含まれていない

## 3. デプロイコマンド

```bash
# ローカルでビルドテスト
npm run build

# Vercelにデプロイ
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

## 4. デプロイ後の確認

### 基本動作確認
- [ ] トップページが表示される
- [ ] ダッシュボードにアクセスできる
- [ ] CoT生成ページが動作する

### API動作確認
- [ ] `/api/viral/cot-session/create` - セッション作成
- [ ] `/api/viral/cot-session/[id]/process` - 処理実行
- [ ] `/api/dashboard/stats` - ダッシュボード統計

### Cron Jobs確認
- [ ] process-cot-sessions（2分ごと）
- [ ] scheduled-posts（15分ごと）
- [ ] collect-performance（30分ごと）

## 5. トラブルシューティング

### よくあるエラー

1. **"Module not found"エラー**
   - ファイル名の大文字小文字を確認
   - importパスの確認

2. **環境変数エラー**
   - Vercel管理画面で環境変数が設定されているか確認
   - `vercel env pull`で最新の環境変数を取得

3. **Prismaエラー**
   - `prisma generate`がビルド時に実行されているか確認
   - DATABASE_URLとDIRECT_URLの両方が設定されているか確認

4. **タイムアウトエラー**
   - vercel.jsonでmaxDurationが設定されているか確認
   - Vercel PROプランの場合は300秒まで可能

## 6. 監視とログ

### Vercel Functions Logs
```bash
vercel logs --follow
```

### エラー監視
- Vercel管理画面のFunctionsタブでエラーを確認
- Real-time logsで詳細なログを確認

## 7. セキュリティ確認

- [ ] CRON_SECRETが設定されている
- [ ] API routeに適切な認証がある
- [ ] 環境変数に機密情報が含まれていない（.env.localは除外）