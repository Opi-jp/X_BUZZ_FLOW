# 手動実行スクリプト

このディレクトリには、必要に応じて手動で実行するスクリプトが保存されています。

## スクリプト一覧

### データベース関連
- `execute-sql.js` - SQLを直接実行
- `execute-v2-migration.js` - V2マイグレーション実行

### コンテンツ生成関連
- `run-cot-full-session.js` - Chain of Thoughtフルセッション実行
- `complete-phase5.js` - フェーズ5の実行
- `quick-phase4-execute.js` - フェーズ4のクイック実行
- `create-drafts-manually.js` - 手動での下書き作成

## 使用方法

```bash
# 例: CoTフルセッション実行
node scripts/manual/run-cot-full-session.js

# 例: V2マイグレーション実行
node scripts/manual/execute-v2-migration.js
```

## 注意事項

- これらのスクリプトは本番データに影響を与える可能性があります
- 実行前に必ずバックアップを取ってください
- 開発環境での動作確認を推奨します

---

*最終更新: 2025/06/20*