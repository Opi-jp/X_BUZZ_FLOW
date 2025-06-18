#!/bin/bash

# 開発環境のヘルスチェック

echo "🏥 X_BUZZ_FLOW ヘルスチェック"
echo "================================"

# 1. Next.jsサーバー
echo -n "Next.js (Port 3000): "
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ 稼働中"
else
    echo "❌ 停止中"
fi

# 2. Prisma Studio
echo -n "Prisma Studio (Port 5555): "
if lsof -ti:5555 > /dev/null 2>&1; then
    echo "✅ 稼働中"
else
    echo "❌ 停止中"
fi

# 3. データベース接続
echo -n "データベース接続: "
node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ 正常');
    return prisma.\$disconnect();
  })
  .catch(() => {
    console.log('❌ エラー');
  });
" 2>/dev/null

# 4. 環境変数
echo -n "環境変数 (.env.local): "
if [ -f .env.local ]; then
    echo "✅ 存在"
else
    echo "❌ 不足"
fi

echo ""
echo "💡 問題がある場合は ./scripts/dev-start.sh を実行してください"