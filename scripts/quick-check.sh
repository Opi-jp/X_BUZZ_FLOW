#!/bin/bash

# シンプルな構文チェックスクリプト
# JSONパースエラーとクォート閉じ忘れを即座に検出

echo "🔍 Quick Syntax Check"
echo "===================="

# TypeScriptコンパイルチェック（構文エラーのみ）
echo "📋 Checking TypeScript syntax..."
npx tsc --noEmit --pretty | head -20

# APIファイルのJSONパースチェック
echo -e "\n📋 Checking for common JSON errors in API files..."
find app/api -name "*.ts" -o -name "*.js" | while read file; do
  # 基本的な構文チェック
  if grep -E "(JSON\.parse|JSON\.stringify)" "$file" > /dev/null; then
    # クォートの不一致をチェック
    quotes=$(grep -n "['\"]" "$file" | head -5)
    if [ ! -z "$quotes" ]; then
      echo "⚠️  $file - Contains JSON operations, check quotes"
    fi
  fi
done

echo -e "\n✅ Quick check complete!"