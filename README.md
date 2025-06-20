# X_BUZZ_FLOW

AIを使ったTwitterバイラルコンテンツ生成システム。

## 🚀 クイックスタート

### 開発環境の起動
```bash
# Claude-dev統合開発環境（推奨）
./scripts/dev-persistent-enhanced.sh
```

### 重要ドキュメント
```bash
cat START_HERE.md      # エントリーポイント
cat CLAUDE.md          # Claude専用開発ガイド
cat ERRORS.md          # エラー解決集
```

## 🛠 開発ツール

### エラー記録システム
```bash
# スマートエラー記録（対話的）
node scripts/dev-tools/smart-error-recorder.js

# 自動エラーキャプチャ（バックグラウンド）
node scripts/dev-tools/auto-error-capture.js

# バックエンド専用エラーモニター
node scripts/dev-tools/backend-error-monitor.js
```

### ビルド監視
```bash
# ビルドエラーをClaude形式で出力
node scripts/dev-tools/build-monitor.js
```

### その他のツール
- API依存関係スキャナー
- DB整合性チェッカー
- プロンプトエディター
- 統合監視ダッシュボード

詳細は `CLAUDE.md` を参照してください。