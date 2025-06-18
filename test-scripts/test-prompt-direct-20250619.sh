#!/bin/bash

# プロンプトエディターの非インタラクティブテスト
# 2025-06-19

echo "=== プロンプトエディターの非インタラクティブ実行テスト ==="
echo ""

# テスト1: Perplexity
echo "📍 Test 1: Perplexity - トピック収集"
echo "────────────────────────────────────────"
node scripts/dev-tools/prompt-editor.js test-direct perplexity/collect-topics.txt \
  theme="AIと働き方" \
  platform=Twitter \
  style=エンターテイメント \
  --non-interactive

echo ""
echo "✅ Test 1 完了"
echo ""

# 結果ファイルの確認
echo "📁 結果ファイルの確認:"
ls -la prompt-test-results/ | tail -5

echo ""
echo "=== テスト完了 ==="