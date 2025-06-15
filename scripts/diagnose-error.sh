#!/bin/bash

# エラー自動診断スクリプト
# "ECONNREFUSED"などのエラーが出たときに実行

echo "🔍 エラー診断を開始します..."
echo ""

# よくあるエラーパターン
ECONNREFUSED=false
PRISMA_ERROR=false
PORT_ERROR=false

# 引数からエラーメッセージを取得
ERROR_MSG="$1"

if [[ "$ERROR_MSG" == *"ECONNREFUSED"* ]] || [[ "$ERROR_MSG" == *"connect ECONNREFUSED"* ]]; then
  ECONNREFUSED=true
fi

if [[ "$ERROR_MSG" == *"PrismaClient"* ]] || [[ "$ERROR_MSG" == *"P2021"* ]]; then
  PRISMA_ERROR=true
fi

if [[ "$ERROR_MSG" == *"address already in use"* ]] || [[ "$ERROR_MSG" == *"Port"* ]]; then
  PORT_ERROR=true
fi

echo "📊 診断結果:"
echo ""

# 1. サーバー起動チェック
echo "1️⃣ サーバー起動状態:"
next_running=$(lsof -ti:3000 2>/dev/null)
if [ -z "$next_running" ]; then
  echo "   ❌ Next.js開発サーバー: 未起動"
  echo "   💡 解決策: npm run dev を実行"
  PROBLEM_FOUND=true
else
  echo "   ✅ Next.js開発サーバー: 稼働中"
fi

prisma_running=$(lsof -ti:5555 2>/dev/null)
if [ -z "$prisma_running" ]; then
  echo "   ⚠️  Prisma Studio: 未起動（オプション）"
else
  echo "   ✅ Prisma Studio: 稼働中"
fi

echo ""

# 2. 接続エラーの診断
if [ "$ECONNREFUSED" = true ]; then
  echo "2️⃣ 接続拒否エラー (ECONNREFUSED) を検出:"
  echo "   原因: サーバーが起動していない、またはポートが異なる"
  echo ""
  echo "   🔧 推奨される解決手順:"
  echo "   1. ./scripts/dev-start.sh を実行（すべて自動起動）"
  echo "   2. または手動で: npm run dev"
  PROBLEM_FOUND=true
fi

# 3. Prismaエラーの診断
if [ "$PRISMA_ERROR" = true ]; then
  echo "3️⃣ Prismaエラーを検出:"
  echo "   原因: DB接続設定の問題またはスキーマの不一致"
  echo ""
  echo "   🔧 推奨される解決手順:"
  echo "   1. npx prisma generate（クライアント再生成）"
  echo "   2. npx prisma db push（スキーマ同期）"
  echo "   3. vercel env pull .env.local（環境変数更新）"
  PROBLEM_FOUND=true
fi

# 4. ポートエラーの診断
if [ "$PORT_ERROR" = true ]; then
  echo "4️⃣ ポート競合エラーを検出:"
  echo "   原因: 既に別のプロセスがポートを使用中"
  echo ""
  echo "   🔧 推奨される解決手順:"
  echo "   1. ./scripts/cleanup-ports.sh を実行"
  echo "   2. オプション3（すべて停止）を選択"
  echo "   3. ./scripts/dev-start.sh で再起動"
  PROBLEM_FOUND=true
fi

# 5. 一般的な診断
if [ "$PROBLEM_FOUND" != true ]; then
  echo "特定のエラーパターンは検出されませんでした。"
  echo ""
  echo "🔧 一般的な解決手順:"
  echo "1. 開発環境の状態確認:"
  echo "   ./scripts/dev-status.sh"
  echo ""
  echo "2. すべてリセットして再起動:"
  echo "   ./scripts/cleanup-ports.sh（オプション3）"
  echo "   ./scripts/dev-start.sh"
  echo ""
  echo "3. DB接続テスト:"
  echo "   node scripts/test-db-connection.js"
fi

echo ""
echo "========================================="
echo "💡 クイック解決コマンド:"
echo ""
echo "# ほとんどの問題を解決:"
echo "./scripts/dev-start.sh"
echo ""
echo "# それでもダメなら完全リセット:"
echo "./scripts/cleanup-ports.sh  # オプション3を選択"
echo "rm -rf node_modules"
echo "npm install"
echo "npx prisma generate"
echo "./scripts/dev-start.sh"
echo "========================================="