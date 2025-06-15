#!/bin/bash

# 開発環境を停止するスクリプト

PID_FILE="/tmp/xbuzz-dev.pid"

if [ ! -f $PID_FILE ]; then
    echo "❌ 開発環境が起動していません"
    exit 1
fi

echo "🛑 開発環境を停止します..."

# PIDファイルからプロセスIDを読み取り
while read pid; do
    if ps -p $pid > /dev/null 2>&1; then
        kill $pid 2>/dev/null
        echo "   停止: PID $pid"
    fi
done < $PID_FILE

# PIDファイルを削除
rm -f $PID_FILE

echo "✅ 開発環境を停止しました"