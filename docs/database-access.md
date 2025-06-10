# Supabaseデータベースアクセス方法

## Supabase管理画面
- URL: https://supabase.com/dashboard/project/qcbgpjeexmfqfekzvwkt
- Table Editorから直接データを確認・編集可能

## ローカルからのアクセス
```bash
# Prisma Studio（GUI）でデータベースを閲覧
npm run prisma:studio

# コマンドラインからデータを確認
npx prisma db pull  # 最新のスキーマを取得
npx prisma db seed  # シードデータの投入（作成する場合）
```

## データのバックアップ
```bash
# Supabase CLIを使用したバックアップ
npx supabase db dump --project-ref qcbgpjeexmfqfekzvwkt > backup.sql

# Prismaを使用したエクスポート
npx prisma db execute --file ./scripts/export-data.sql
```

## 注意事項
- 無料プランは1週間アクセスがないと一時停止されます
- 定期的にアクセスするか、有料プランへのアップグレードを検討してください
- データ容量は500MBまでです