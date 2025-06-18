#!/bin/bash

echo "🧹 最終クリーンアップを実行..."

# 1. 古いテストスクリプトをさらに整理
echo "📦 古いテストスクリプトを日付別に整理..."
cd test-scripts/archive

# 2024年のファイルをさらに古いアーカイブへ
mkdir -p 2024
for file in *.js; do
    if [[ -f "$file" ]]; then
        # ファイルの作成日を確認（簡易的に名前から推測）
        if [[ "$file" =~ test-session-[0-9]+ ]] || 
           [[ "$file" =~ test-mock ]] ||
           [[ "$file" =~ test-old ]]; then
            echo "  2024アーカイブ: $file"
            mv "$file" 2024/ 2>/dev/null
        fi
    fi
done
cd ../..

# 2. 不要な一時ファイルを削除
echo "🗑️  一時ファイルを削除..."
find . -name ".DS_Store" -delete 2>/dev/null
find . -name "*.log" -not -path "./logs/*" -delete 2>/dev/null
find . -name "*.tmp" -delete 2>/dev/null

# 3. package.jsonのスクリプトを整理用に更新
echo "📋 便利なスクリプトを追加..."
cat > scripts/add-cleanup-commands.js << 'EOF'
const fs = require('fs');
const packageJson = require('../package.json');

// クリーンアップ用のスクリプトを追加
packageJson.scripts = {
  ...packageJson.scripts,
  "clean": "rm -rf .next node_modules",
  "clean:install": "npm run clean && npm install",
  "test:latest": "node test-scripts/$(ls -t test-scripts/*.js | head -1)",
  "archive:old": "bash scripts/night-cleanup.sh",
  "docs:list": "find docs/current -name '*.md' -exec basename {} \\;"
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ package.json にクリーンアップコマンドを追加しました');
EOF

node scripts/add-cleanup-commands.js

# 4. READMEに整理後の構造を記載
cat > ORGANIZATION_SUMMARY.md << 'EOF'
# X_BUZZ_FLOW ファイル整理完了レポート

## 📁 整理後の構造

### テストスクリプト (`/test-scripts/`)
- **アクティブ**: 最新30個 + 重要なもの
- **アーカイブ済み**: `/test-scripts/archive/` に移動
  - 重複したcardiテスト
  - 古いバージョン

### フロントエンド (`/app/`)
- **統合予定のメインシステム**:
  - `/viral/v2/` - V2バイラルシステム（メイン）
  - `/viral/unified/` - 統合UI
  - `/integrated-analysis/` - 統合分析
  
- **アーカイブ済み**: `/app/archive/` に移動
  - `/viral/cot-step/`
  - `/viral/enhanced/`
  - `/viral/summary/`
  - `/viral-test/`

### ドキュメント (`/docs/`)
- **最新版**: `/docs/current/`
  - naming-convention-redesign.md
  - news-viral-integration-design.md
  - historical-tweet-analysis-plan.md
  - complete-system-integration-design.md
  
- **アーカイブ**: `/docs/archive/`
  - 古いバージョン
  - 重複ドキュメント

## 🎯 次のステップ

1. `/docs/current/` のドキュメントに基づいて実装を進める
2. V2システムをベースに統合UIを構築
3. 不要なシステムは段階的に廃止

## 🛠️ 便利なコマンド

```bash
# クリーンインストール
npm run clean:install

# 最新のテストスクリプトを実行
npm run test:latest

# 古いファイルをアーカイブ
npm run archive:old

# 現在のドキュメント一覧
npm run docs:list
```
EOF

echo ""
echo "📊 最終統計:"
echo "  - アクティブなテストスクリプト: $(ls test-scripts/*.js 2>/dev/null | wc -l)"
echo "  - アーカイブ（通常）: $(ls test-scripts/archive/*.js 2>/dev/null | wc -l)"
echo "  - アーカイブ（2024）: $(ls test-scripts/archive/2024/*.js 2>/dev/null | wc -l)"
echo "  - 削除した一時ファイル: $(find . -name ".DS_Store" -o -name "*.tmp" | wc -l)"

echo ""
echo "✨ すべてのクリーンアップが完了しました！"
echo "📄 詳細は ORGANIZATION_SUMMARY.md を参照してください。"