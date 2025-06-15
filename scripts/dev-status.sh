#!/bin/bash

# 開発環境ステータス確認スクリプト

echo "=== X_BUZZ_FLOW 開発環境ステータス ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. サーバー状態
echo "🖥️  サーバー状態:"
echo ""

# Next.js
next_pid=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$next_pid" ]; then
  echo "✅ Next.js開発サーバー: 稼働中 (Port 3000, PID: $next_pid)"
else
  echo "❌ Next.js開発サーバー: 停止中"
fi

# Prisma Studio
prisma_pid=$(lsof -ti:5555 2>/dev/null)
if [ ! -z "$prisma_pid" ]; then
  echo "✅ Prisma Studio: 稼働中 (Port 5555, PID: $prisma_pid)"
else
  echo "❌ Prisma Studio: 停止中"
fi

echo ""

# 2. データベース接続
echo "🗄️  データベース接続:"
echo ""

# .env.localの存在確認
if [ -f .env.local ]; then
  echo "✅ .env.local: 存在"
  
  # DATABASE_URLの確認（値は表示しない）
  if grep -q "DATABASE_URL" .env.local; then
    echo "✅ DATABASE_URL: 設定済み"
  else
    echo "❌ DATABASE_URL: 未設定"
  fi
  
  # DIRECT_URLの確認
  if grep -q "DIRECT_URL" .env.local; then
    echo "✅ DIRECT_URL: 設定済み"
  else
    echo "❌ DIRECT_URL: 未設定"
  fi
else
  echo "❌ .env.local: 存在しない"
fi

# PostgreSQL接続テスト
echo ""
echo "🔍 DB接続テスト中..."
node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ データベース接続: 成功');
    return prisma.\$disconnect();
  })
  .catch((err) => {
    console.log('❌ データベース接続: 失敗');
    console.log('  エラー:', err.message);
  });
" 2>/dev/null || echo "❌ Prismaクライアントエラー"

echo ""

# 3. ポート競合チェック
echo "⚠️  ポート競合チェック:"
echo ""

conflict=false
for port in 3001 3002 3003; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    echo "⚠️  Port $port が使用中 (PID: $pid) - 別のNext.jsインスタンス？"
    conflict=true
  fi
done

if [ "$conflict" = false ]; then
  echo "✅ ポート競合なし"
fi

echo ""

# 4. 推奨アクション
echo "💡 推奨アクション:"
echo ""

if [ -z "$next_pid" ]; then
  echo "1. Next.js開発サーバーを起動: npm run dev"
fi

if [ -z "$prisma_pid" ]; then
  echo "2. Prisma Studioを起動: npx prisma studio"
fi

if [ "$conflict" = true ]; then
  echo "3. ポート競合を解決: ./scripts/cleanup-ports.sh"
fi

echo ""
echo "----------------------------------------"
echo "🚀 クイックコマンド:"
echo "  開発開始: npm run dev"
echo "  DB確認:  npx prisma studio"
echo "  ポート整理: ./scripts/cleanup-ports.sh"
echo "  Phase1テスト: node scripts/test-db-phase1.js"