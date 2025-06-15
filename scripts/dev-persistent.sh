#!/bin/bash

# 永続的な開発環境起動スクリプト（tmux使用）

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
    echo "🚀 新しいtmuxセッションを作成します"
    
    # 新しいセッションを作成
    tmux new-session -d -s xbuzz -n next
    
    # Next.jsサーバーを起動
    tmux send-keys -t xbuzz:next "cd /Users/yukio/X_BUZZ_FLOW && npm run dev" Enter
    
    # Prisma Studioウィンドウを作成
    tmux new-window -t xbuzz -n prisma
    tmux send-keys -t xbuzz:prisma "cd /Users/yukio/X_BUZZ_FLOW && npx prisma studio" Enter
    
    # ログ監視ウィンドウを作成
    tmux new-window -t xbuzz -n logs
    tmux send-keys -t xbuzz:logs "cd /Users/yukio/X_BUZZ_FLOW && tail -f .next/server/*.log 2>/dev/null || echo 'ログファイルが見つかりません'" Enter
    
    # セッションに接続
    echo "✅ 開発環境が起動しました"
    echo ""
    echo "📍 使い方:"
    echo "   接続: tmux attach -t xbuzz"
    echo "   切り離し: Ctrl+B → D"
    echo "   ウィンドウ切り替え: Ctrl+B → 数字"
    echo "   終了: tmux kill-session -t xbuzz"
    echo ""
    tmux attach-session -t xbuzz
fi