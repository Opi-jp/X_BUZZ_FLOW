#!/bin/bash

# 最新のPENDINGセッションを実行
SESSION_ID="2b6a7f4d-1629-4bfa-8945-7cd0bab31145"

echo "🚀 CoTセッション実行テスト"
echo "セッションID: $SESSION_ID"
echo ""

# 実行
echo "📡 APIリクエスト送信..."
curl -X POST https://x-buzz-flow.vercel.app/api/viral/cot-session/$SESSION_ID/process \
  -H "Content-Type: application/json" \
  -H "Cookie: __Secure-next-auth.session-token=YOUR_SESSION_TOKEN" \
  --max-time 120 \
  -v

echo ""
echo "✅ テスト完了"