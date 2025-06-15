#!/bin/bash

# ポートクリーンアップスクリプト
# 開発環境のポート競合を解決

echo "=== 開発環境ポートクリーンアップ ==="
echo ""

# 使用中のポートを確認
echo "📍 現在使用中のポート:"
echo ""

# Next.js開発サーバー (3000-3010)
echo "▶ Next.js開発サーバー (3000-3010):"
for port in {3000..3010}; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    echo "  Port $port: PID $pid ($(ps -p $pid -o comm= 2>/dev/null || echo "不明"))"
  fi
done

echo ""

# Prisma Studio (5555)
echo "▶ Prisma Studio (5555):"
pid=$(lsof -ti:5555 2>/dev/null)
if [ ! -z "$pid" ]; then
  echo "  Port 5555: PID $pid ($(ps -p $pid -o comm= 2>/dev/null || echo "不明"))"
else
  echo "  Port 5555: 未使用"
fi

echo ""

# PostgreSQL (5432)
echo "▶ PostgreSQL (5432):"
pid=$(lsof -ti:5432 2>/dev/null)
if [ ! -z "$pid" ]; then
  echo "  Port 5432: PID $pid ($(ps -p $pid -o comm= 2>/dev/null || echo "不明"))"
else
  echo "  Port 5432: 未使用"
fi

echo ""
echo "----------------------------------------"
echo ""

# クリーンアップオプション
echo "🧹 クリーンアップオプション:"
echo "  1) Next.js開発サーバーをすべて停止 (3000-3010)"
echo "  2) Prisma Studioを停止 (5555)"
echo "  3) すべての開発サーバーを停止"
echo "  4) 特定のポートを解放"
echo "  0) 終了"
echo ""
read -p "選択してください (0-4): " choice

case $choice in
  1)
    echo ""
    echo "Next.js開発サーバーを停止中..."
    for port in {3000..3010}; do
      pid=$(lsof -ti:$port 2>/dev/null)
      if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null && echo "✅ Port $port (PID: $pid) を解放しました"
      fi
    done
    ;;
  2)
    echo ""
    echo "Prisma Studioを停止中..."
    pid=$(lsof -ti:5555 2>/dev/null)
    if [ ! -z "$pid" ]; then
      kill -9 $pid 2>/dev/null && echo "✅ Port 5555 (PID: $pid) を解放しました"
    else
      echo "Prisma Studioは起動していません"
    fi
    ;;
  3)
    echo ""
    echo "すべての開発サーバーを停止中..."
    # Next.js
    for port in {3000..3010}; do
      pid=$(lsof -ti:$port 2>/dev/null)
      if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null && echo "✅ Port $port (PID: $pid) を解放しました"
      fi
    done
    # Prisma Studio
    pid=$(lsof -ti:5555 2>/dev/null)
    if [ ! -z "$pid" ]; then
      kill -9 $pid 2>/dev/null && echo "✅ Port 5555 (PID: $pid) を解放しました"
    fi
    ;;
  4)
    echo ""
    read -p "解放したいポート番号を入力: " port
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
      kill -9 $pid 2>/dev/null && echo "✅ Port $port (PID: $pid) を解放しました"
    else
      echo "Port $port は使用されていません"
    fi
    ;;
  0)
    echo "終了します"
    exit 0
    ;;
  *)
    echo "無効な選択です"
    ;;
esac

echo ""
echo "----------------------------------------"
echo ""
echo "🚀 推奨される起動手順:"
echo "  1) npm run dev       # Port 3000で起動"
echo "  2) npx prisma studio # Port 5555で起動"
echo ""
echo "💡 ヒント: .env.localのDATABASE_URLが正しいことを確認してください"