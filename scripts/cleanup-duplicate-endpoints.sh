#!/bin/bash

# APIエンドポイントの重複を削除するスクリプト
# 注意: このスクリプトは実行前に必ずバックアップを取ってください

echo "🧹 APIエンドポイントの重複削除スクリプト"
echo "========================================="
echo ""

# ドライランモード（デフォルト）
DRY_RUN=true
if [ "$1" = "--execute" ]; then
  DRY_RUN=false
  echo "⚠️  実行モードで動作します。ファイルが削除されます！"
else
  echo "📋 ドライランモードで動作します。実際の削除は行いません。"
  echo "   実行するには: $0 --execute"
fi
echo ""

# プロジェクトルートに移動
cd "$(dirname "$0")/.." || exit 1

# 削除対象のファイルリスト
declare -a files_to_remove=(
  # テストエンドポイント（/api/debug/配下に移動済みまたは不要）
  "app/api/test-viral-analysis/route.ts"
  "app/api/test-web-search-responses/route.ts"
  "app/api/test-gpt-session/route.ts"
  "app/api/test-openai-simple/route.ts"
  "app/api/test-response-debug/route.ts"
  "app/api/test-full-step1/route.ts"
  "app/api/test-latest-news/route.ts"
  "app/api/test-step1-direct/route.ts"
  "app/api/test-step1-responses-v2/route.ts"
  "app/api/test-step1-v2/route.ts"
  "app/api/test-web-search/route.ts"
  "app/api/test-google-search/route.ts"
  "app/api/test-twitter-oauth/route.ts"
  "app/api/test-continue/route.ts"
  "app/api/test-async/route.ts"
  "app/api/viral/test-auto-complete/route.ts"
  "app/api/viral/test-json-format/route.ts"
  "app/api/viral/test-live-search/route.ts"
  "app/api/viral/test-web-search/route.ts"
  "app/api/auth/test-oauth/route.ts"
  "app/api/news/test-sources/route.ts"
  
  # 重複しているエンドポイント（新しいパスにリダイレクトされる）
  "app/api/news/latest/redirect.ts"  # redirect.tsファイルは不要
)

# 削除実行
echo "🗑️  削除対象ファイル:"
echo ""
deleted_count=0
for file in "${files_to_remove[@]}"; do
  if [ -f "$file" ]; then
    echo "  ❌ $file"
    if [ "$DRY_RUN" = false ]; then
      rm "$file"
      ((deleted_count++))
    fi
  fi
done

# 空のディレクトリを削除
echo ""
echo "📁 空のディレクトリを確認中..."
empty_dirs=$(find app/api -type d -empty)
if [ -n "$empty_dirs" ]; then
  echo "空のディレクトリ:"
  echo "$empty_dirs"
  if [ "$DRY_RUN" = false ]; then
    echo "$empty_dirs" | xargs rmdir
  fi
fi

# 結果表示
echo ""
echo "========================================="
if [ "$DRY_RUN" = true ]; then
  echo "✅ ドライラン完了"
  echo "   削除される予定のファイル数: $(echo "${files_to_remove[@]}" | wc -w)"
else
  echo "✅ 削除完了"
  echo "   削除されたファイル数: $deleted_count"
fi

# リダイレクトが正しく機能することを確認するための提案
echo ""
echo "📝 次のステップ:"
echo "1. middleware.tsのリダイレクトが正しく機能することを確認"
echo "2. フロントエンドコードで旧エンドポイントを使用している箇所を更新"
echo "3. api-endpoints.tsとapi-client.tsを使用するようにコードを移行"