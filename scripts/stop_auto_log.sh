#!/bin/bash

# 自動ログ更新の停止スクリプト

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 保存されたセッションIDを読み込み
if [ -f "$HOME/.current_log_session" ]; then
    session_id=$(cat "$HOME/.current_log_session")
    echo -e "${YELLOW}保存されたセッションID: $session_id${NC}"
else
    # なければ最新のセッションを停止
    echo -e "${YELLOW}最新のアクティブセッションを停止します${NC}"
fi

# 停止実行
./scripts/auto_log_updater.sh stop $session_id

# セッションIDファイルを削除
rm -f "$HOME/.current_log_session"

echo -e "\n${GREEN}✅ 自動ログを停止しました${NC}"