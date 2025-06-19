#!/bin/bash

# CoTシステムの最小限の動作確認
# エラーが出たらすぐに止まるシンプルなテスト

echo "🚀 CoT System Quick Test"
echo "======================="

# 1. サーバーが起動しているか確認
echo "1️⃣ Checking server..."
curl -s http://localhost:3000/api/health > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Server is not running on port 3000"
    echo "   Run: ./scripts/dev-persistent.sh"
    exit 1
fi
echo "✅ Server is running"

# 2. セッション作成テスト
echo -e "\n2️⃣ Creating test session..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/generation/content/session/create \
    -H "Content-Type: application/json" \
    -d '{"theme":"AIと働き方","platform":"Twitter","style":"エンターテイメント"}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to create session"
    echo "Response: $SESSION_RESPONSE"
    exit 1
fi

echo "✅ Session created: $SESSION_ID"

# 3. セッション状態確認
echo -e "\n3️⃣ Checking session status..."
STATUS_RESPONSE=$(curl -s http://localhost:3000/api/generation/content/sessions/$SESSION_ID)
echo "Status: $(echo $STATUS_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"

echo -e "\n✅ Basic test passed!"
echo "Session URL: http://localhost:3000/generation/viral/v2/sessions/$SESSION_ID"