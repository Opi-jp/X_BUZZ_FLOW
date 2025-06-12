# バイラルコンテンツシステム デプロイチェックリスト

## 1. 環境変数設定（Vercel）

以下の環境変数をVercelプロジェクトに追加する必要があります：

### 新規追加
- [ ] `OPENAI_API_KEY` - ChatGPT API用（必須）

### 既存確認
- [ ] `CLAUDE_API_KEY` - Claude API用
- [ ] `DATABASE_URL` - Supabase接続URL
- [ ] `DIRECT_URL` - Supabase直接接続URL
- [ ] `NEXTAUTH_URL` - 本番URL（https://x-buzz-flow.vercel.app）
- [ ] `NEXTAUTH_SECRET` - 認証用シークレット
- [ ] `TWITTER_CLIENT_ID` - Twitter OAuth
- [ ] `TWITTER_CLIENT_SECRET` - Twitter OAuth
- [ ] `CRON_SECRET` - Cron実行用シークレット

## 2. データベースマイグレーション

Vercelデプロイ後、以下のコマンドを実行：

```bash
# ローカルで本番環境に対してマイグレーション実行
npx prisma migrate deploy
```

## 3. 動作確認

### 基本機能
1. [ ] https://x-buzz-flow.vercel.app/viral にアクセス
2. [ ] 「トレンド分析 (ChatGPT)」ボタンをクリック
3. [ ] エラーがないことを確認
4. [ ] 「自動ワークフロー実行」ボタンをクリック
5. [ ] 投稿が生成されることを確認

### API確認
- [ ] `/api/viral/analyze-trends` - POST
- [ ] `/api/viral/generate-posts` - POST
- [ ] `/api/viral/workflow/auto-generate` - GET/POST

### Cron動作確認
- [ ] Vercelダッシュボードで「Functions」タブを確認
- [ ] `/api/viral/cron` が30分ごとに実行されることを確認

## 4. トラブルシューティング

### よくあるエラー

1. **「OPENAI_API_KEY is not defined」エラー**
   - Vercel環境変数に`OPENAI_API_KEY`を追加

2. **データベースエラー**
   - `npx prisma generate`を実行
   - `npx prisma migrate deploy`を実行

3. **認証エラー**
   - Twitter OAuth設定を確認
   - Callback URLが正しいか確認

## 5. 本番運用開始前チェック

- [ ] ChatGPT APIの利用制限確認
- [ ] Claude APIの利用制限確認
- [ ] Supabaseの容量確認
- [ ] Vercelの関数実行時間制限確認（30秒）

## 6. モニタリング

- Vercel Functions ログで定期実行を監視
- Supabaseダッシュボードでデータ確認
- エラーログの定期確認