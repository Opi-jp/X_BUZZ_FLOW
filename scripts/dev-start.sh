#!/bin/bash

# 開発環境一括起動スクリプト
# これ1つで必要なものをすべて起動

echo "🚀 X_BUZZ_FLOW 開発環境を起動します..."
echo ""

# 1. 事前チェック
echo "📋 事前チェック中..."

# ポート確認
port_3000=$(lsof -ti:3000 2>/dev/null)
port_5555=$(lsof -ti:5555 2>/dev/null)

if [ ! -z "$port_3000" ] || [ ! -z "$port_5555" ]; then
  echo "⚠️  使用中のポートを検出しました"
  
  if [ ! -z "$port_3000" ]; then
    echo "   Port 3000: PID $port_3000"
  fi
  
  if [ ! -z "$port_5555" ]; then
    echo "   Port 5555: PID $port_5555"
  fi
  
  echo ""
  read -p "既存のプロセスを停止して続行しますか？ (y/n): " answer
  
  if [ "$answer" = "y" ]; then
    echo "既存プロセスを停止中..."
    [ ! -z "$port_3000" ] && kill -9 $port_3000 2>/dev/null
    [ ! -z "$port_5555" ] && kill -9 $port_5555 2>/dev/null
    sleep 2
  else
    echo "起動を中止しました"
    exit 1
  fi
fi

# 環境変数チェック
if [ ! -f .env.local ]; then
  echo "❌ .env.local が見つかりません"
  echo "   Vercelから環境変数を取得してください:"
  echo "   vercel env pull .env.local"
  exit 1
fi

echo "✅ 事前チェック完了"
echo ""

# 2. Next.js開発サーバー起動
echo "🌐 Next.js開発サーバーを起動中..."
npm run dev &
NEXTJS_PID=$!

# 起動待機
sleep 5

# 起動確認
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "✅ Next.js開発サーバー: http://localhost:3000"
else
  echo "❌ Next.js開発サーバーの起動に失敗しました"
  exit 1
fi

# 3. Prisma Studio起動
echo ""
echo "🗄️  Prisma Studioを起動中..."
npx prisma studio &
PRISMA_PID=$!

# 起動待機
sleep 3

# 起動確認
if lsof -ti:5555 >/dev/null 2>&1; then
  echo "✅ Prisma Studio: http://localhost:5555"
else
  echo "⚠️  Prisma Studioの起動に失敗（DBビューアーなので続行可能）"
fi

# 4. DB接続テスト
echo ""
echo "🔍 データベース接続をテスト中..."
sleep 2

node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(async () => {
    console.log('✅ データベース接続: 成功');
    
    // セッション数を確認
    const count = await prisma.cotSession.count();
    console.log(\`📊 既存のCoTセッション数: \${count}\`);
    
    return prisma.\$disconnect();
  })
  .catch((err) => {
    console.log('❌ データベース接続: 失敗');
    console.log('  エラー:', err.message);
    process.exit(1);
  });
" || {
  echo "❌ DB接続に失敗しました"
  echo "   環境変数を確認してください"
  kill $NEXTJS_PID $PRISMA_PID 2>/dev/null
  exit 1
}

# 5. 起動完了
echo ""
echo "========================================="
echo "✅ 開発環境の起動が完了しました！"
echo "========================================="
echo ""
echo "📍 アクセスURL:"
echo "   Next.js: http://localhost:3000"
echo "   Prisma:  http://localhost:5555"
echo ""
echo "🛠️  次のステップ:"
echo "   1. ブラウザで http://localhost:3000 を開く"
echo "   2. CoTセッションをテスト: /viral/cot"
echo "   3. DB確認: http://localhost:5555"
echo ""
echo "⚠️  終了する場合:"
echo "   Ctrl+C を押すか、./scripts/cleanup-ports.sh を実行"
echo ""
echo "プロセスID:"
echo "   Next.js: $NEXTJS_PID"
echo "   Prisma:  $PRISMA_PID"
echo ""

# プロセス監視
echo "📡 サーバー監視中... (Ctrl+Cで終了)"

# 終了時のクリーンアップ
trap "echo ''; echo '🛑 開発環境を停止中...'; kill $NEXTJS_PID $PRISMA_PID 2>/dev/null; exit 0" INT TERM

# プロセスの監視を継続
wait