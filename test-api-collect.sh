#!/bin/bash

# APIを直接叩いてエラーを確認
echo "🔍 Collect APIを直接テスト"
echo ""

# セッションIDは適当（エラーメッセージが見たいだけ）
curl -X POST http://localhost:3000/api/generation/content/sessions/test123/collect \
  -H "Content-Type: application/json" \
  -v