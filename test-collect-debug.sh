#!/bin/bash

# デバッグモードでcollect APIをテスト
echo "🔍 Collect APIデバッグテスト"

# 新しいセッションを作成
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/generation/content/sessions \
  -H "Content-Type: application/json" \
  -d '{"theme": "テスト用テーマ", "platform": "Twitter", "style": "テスト"}')

SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.session.id')
echo "セッションID: $SESSION_ID"

# デバッグヘッダーを付けてcollect APIを呼ぶ
echo -e "\n📡 Collect APIを実行..."
curl -X POST "http://localhost:3000/api/generation/content/sessions/$SESSION_ID/collect" \
  -H "Content-Type: application/json" \
  -H "X-Debug: true" \
  -v 2>&1 | grep -E "(error|message|details|position)" | head -20