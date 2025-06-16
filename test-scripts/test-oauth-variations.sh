#!/bin/bash

echo "🔍 Twitter OAuth 2.0 Callback URL variations test"
echo "=================================================="

CLIENT_ID="d09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ"

echo ""
echo "Test 1: 現在のCallback URL"
curl -s -I "https://api.twitter.com/2/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=https%3A%2F%2Fx-buzz-flow.vercel.app%2Fapi%2Fauth%2Fcallback%2Ftwitter&scope=users.read" | head -1

echo ""
echo "Test 2: localhost Callback URL"
curl -s -I "https://api.twitter.com/2/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Ftwitter&scope=users.read" | head -1

echo ""
echo "Test 3: 他のCallback URL (vercel.app別サブドメイン)"
curl -s -I "https://api.twitter.com/2/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=https%3A%2F%2Foyafukou-web.vercel.app%2Fapi%2Fauth%2Ftwitter%2Fcallback&scope=users.read" | head -1

echo ""
echo "Test 4: Callback URLなしテスト"
curl -s -I "https://api.twitter.com/2/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&scope=users.read" | head -1

echo ""
echo "Test 5: 最小限パラメータ"
curl -s -I "https://api.twitter.com/2/oauth2/authorize?client_id=${CLIENT_ID}" | head -1

echo ""
echo "=================================================="
echo "✅ 期待結果: HTTP/2 302 (リダイレクト)"
echo "❌ 現在結果: HTTP/2 400 (Bad Authentication data)"