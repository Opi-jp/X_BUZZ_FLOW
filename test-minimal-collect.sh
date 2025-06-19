#!/bin/bash

# 最小限のテーマでテスト
echo "🔍 最小限のテストを実行"

# セッション作成
SESSION=$(curl -s -X POST http://localhost:3000/api/generation/content/sessions \
  -H "Content-Type: application/json" \
  -d '{"theme": "AI", "platform": "Twitter", "style": "シンプル"}' | jq -r '.session.id')

echo "セッションID: $SESSION"

# デバッグ情報を取得するため、開発者ツールのAPIをモック
echo -e "\n📡 Collect実行..."
curl -s -X POST "http://localhost:3000/api/generation/content/sessions/$SESSION/collect" \
  -H "Content-Type: application/json" | jq '.'