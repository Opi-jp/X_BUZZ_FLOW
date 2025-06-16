#!/bin/bash

# 永続的な開発環境起動スクリプト（Prisma Studioなし）

# tmuxがインストールされているか確認
if ! command -v tmux &> /dev/null; then
    echo "❌ tmuxがインストールされていません"
    echo "   brew install tmux でインストールしてください"
    exit 1
fi

# 既存のセッションをチェック
if tmux has-session -t xbuzz 2>/dev/null; then
    echo "📍 既存のセッションに接続します"
    tmux attach-session -t xbuzz
else
    echo "🚀 新しいtmuxセッションを作成します（Prisma Studioなし）"
    
    # 新しいセッションを作成
    tmux new-session -d -s xbuzz -n next
    
    # Next.jsサーバーを起動
    tmux send-keys -t xbuzz:next "cd /Users/yukio/X_BUZZ_FLOW && npm run dev" Enter
    
    # ワーカーウィンドウを作成
    tmux new-window -t xbuzz -n worker
    tmux send-keys -t xbuzz:worker "cd /Users/yukio/X_BUZZ_FLOW && node scripts/async-worker-v2.js" Enter
    
    # DBモニターウィンドウを作成（Prisma Studioの代替）
    tmux new-window -t xbuzz -n db-monitor
    tmux send-keys -t xbuzz:db-monitor "cd /Users/yukio/X_BUZZ_FLOW && node scripts/db-monitor.js" Enter
    
    # ログ監視ウィンドウを作成
    tmux new-window -t xbuzz -n logs
    tmux send-keys -t xbuzz:logs "cd /Users/yukio/X_BUZZ_FLOW && tail -f logs/*.log 2>/dev/null || echo 'ログディレクトリを作成してください: mkdir logs'" Enter
    
    # セッションに接続
    echo "✅ 開発環境が起動しました（Prisma Studioなし）"
    echo ""
    echo "📍 使い方:"
    echo "   接続: tmux attach -t xbuzz"
    echo "   切り離し: Ctrl+B → D"
    echo "   ウィンドウ切り替え: Ctrl+B → 数字"
    echo "     0: Next.js開発サーバー"
    echo "     1: 非同期ワーカー"
    echo "     2: DBモニター"
    echo "     3: ログ監視"
    echo "   終了: tmux kill-session -t xbuzz"
    echo ""
    echo "💡 Prisma Studioが必要な場合は別ターミナルで:"
    echo "   npx prisma studio"
    echo ""
    tmux attach-session -t xbuzz
fi