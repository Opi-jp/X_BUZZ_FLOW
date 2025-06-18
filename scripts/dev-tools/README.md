# 開発ツール集

X_BUZZ_FLOWの開発を効率化するための汎用ツール集です。

## 🛠️ ツール一覧

### 統合開発ツール
```bash
node scripts/dev-tools/dev-tools.js start   # 開発環境起動
node scripts/dev-tools/dev-tools.js check   # ヘルスチェック
node scripts/dev-tools/dev-tools.js fix     # 自動修正
node scripts/dev-tools/dev-tools.js test <id>  # 特定機能テスト
node scripts/dev-tools/dev-tools.js clean   # キャッシュクリーン
```

### データベース管理
```bash
node scripts/dev-tools/db-manager.js status   # DB状態確認
node scripts/dev-tools/db-manager.js migrate  # マイグレーション実行
node scripts/dev-tools/db-manager.js check    # スキーマ整合性チェック
node scripts/dev-tools/db-manager.js fix      # 不足カラム/テーブル修正
```

### データベース監視
```bash
node scripts/dev-tools/db-monitor.js          # リアルタイム監視
# Prisma Studioの代替として使用
```

### スキーマ検証
```bash
node scripts/dev-tools/db-schema-validator.js # DB/Prisma整合性チェック
```

### 環境チェック
```bash
./scripts/dev-tools/health-check.sh          # 総合ヘルスチェック
node scripts/dev-tools/check-env.js          # 環境変数確認
node scripts/dev-tools/check-session-urls.js # セッションURL確認
```

## 📝 使用例

### 開発開始時
```bash
# 1. 環境の健全性を確認
./scripts/dev-tools/health-check.sh

# 2. DBの状態を確認
node scripts/dev-tools/db-manager.js status

# 3. 開発環境を起動
node scripts/dev-tools/dev-tools.js start
```

### DBエラー発生時
```bash
# 1. スキーマの整合性を確認
node scripts/dev-tools/db-schema-validator.js

# 2. 必要に応じて修正
node scripts/dev-tools/db-manager.js fix

# 3. リアルタイムでDBを監視
node scripts/dev-tools/db-monitor.js
```

### デバッグ時
```bash
# 環境変数の確認
node scripts/dev-tools/check-env.js

# セッションデータの確認
node scripts/dev-tools/check-session-urls.js
```