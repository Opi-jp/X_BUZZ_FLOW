#!/bin/bash

# バックグラウンドで開発環境を起動するスクリプト

PID_FILE="/tmp/xbuzz-dev.pid"
LOG_DIR="/tmp/xbuzz-logs"

# ログディレクトリを作成
mkdir -p $LOG_DIR

# 既存のプロセスをチェック
if [ -f $PID_FILE ]; then
    OLD_PID=$(cat $PID_FILE)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⚠️  既に開発環境が起動しています (PID: $OLD_PID)"
        echo "   停止する場合: ./scripts/dev-stop.sh"
        exit 0
    fi
fi

echo "🚀 X_BUZZ_FLOW 開発環境をバックグラウンドで起動します..."

# ポートクリーンアップ
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5555 | xargs kill -9 2>/dev/null
sleep 1

# Next.jsをバックグラウンドで起動
cd /Users/yukio/X_BUZZ_FLOW
nohup npm run dev > $LOG_DIR/nextjs.log 2>&1 &
NEXT_PID=$!
echo $NEXT_PID > $PID_FILE

# Prisma Studioをバックグラウンドで起動
nohup npx prisma studio > $LOG_DIR/prisma.log 2>&1 &
PRISMA_PID=$!
echo $PRISMA_PID >> $PID_FILE

# 起動を待つ
echo "⏳ サーバーの起動を待っています..."
sleep 5

# 起動確認
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Next.js開発サーバー: http://localhost:3000"
else
    echo "❌ Next.jsの起動に失敗しました"
    cat $LOG_DIR/nextjs.log
    exit 1
fi

if lsof -ti:5555 > /dev/null 2>&1; then
    echo "✅ Prisma Studio: http://localhost:5555"
else
    echo "⚠️  Prisma Studioの起動に失敗（続行可能）"
fi

echo ""
echo "📍 プロセスID:"
echo "   Next.js: $NEXT_PID"
echo "   Prisma: $PRISMA_PID"
echo ""
echo "📄 ログファイル:"
echo "   Next.js: $LOG_DIR/nextjs.log"
echo "   Prisma: $LOG_DIR/prisma.log"
echo ""
echo "🛑 停止する場合: ./scripts/dev-stop.sh"
echo "📊 ログを見る場合: tail -f $LOG_DIR/nextjs.log"