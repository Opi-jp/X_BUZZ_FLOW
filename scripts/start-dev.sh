#!/bin/bash

echo "🚀 開発サーバーを起動します..."
echo ""

# 環境変数の確認
echo "📋 環境変数の確認:"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo ""

# ポート3000が使用中か確認
if lsof -i :3000 > /dev/null 2>&1; then
  echo "⚠️ ポート3000が使用中です"
  echo "既存のプロセスを停止しますか？ (y/n)"
  read -r response
  if [ "$response" = "y" ]; then
    pkill -f "next dev"
    sleep 2
  fi
fi

echo "📦 サーバー起動中..."
echo ""
echo "アクセスURL:"
echo "- メイン: http://localhost:3000/viral/gpt"
echo "- ログイン: http://localhost:3000/auth/signin"
echo "- 下書き: http://localhost:3000/viral/drafts"
echo ""
echo "Ctrl+C で停止"
echo ""

# 開発サーバー起動
npm run dev