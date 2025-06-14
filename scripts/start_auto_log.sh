#!/bin/bash

# 自動ログ更新の簡単起動スクリプト
# クラッシュ対策を強化したバージョン

# プロジェクト名（固定）
PROJECT="X_BUZZ_FLOW"

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# 作業内容の入力
echo -e "${BLUE}=== X_BUZZ_FLOW 自動ログシステム ===${NC}"
echo -e "${YELLOW}作業内容を入力してください:${NC}"
read -r task_description

if [ -z "$task_description" ]; then
    task_description="開発作業"
fi

# 更新間隔の選択
echo -e "\n${YELLOW}更新間隔を選択してください:${NC}"
echo "1) 5分（デバッグ・テスト作業向け）"
echo "2) 10分（通常の開発作業）※推奨"
echo "3) 15分（設計・調査作業向け）"
echo "4) カスタム（分数を指定）"
echo -n "選択 [1-4] (デフォルト: 2): "
read -r choice

case "$choice" in
    1) interval=5 ;;
    3) interval=15 ;;
    4) 
        echo -n "間隔（分）: "
        read -r interval
        ;;
    *) interval=10 ;;
esac

echo -e "\n${GREEN}✅ 設定内容${NC}"
echo -e "  作業: ${YELLOW}$task_description${NC}"
echo -e "  間隔: ${YELLOW}${interval}分${NC}"
echo -e "\n開始しますか？ (y/n)"
read -r confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 0
fi

# 自動ログ更新を開始
./scripts/auto_log_updater.sh start "$PROJECT" "$task_description" "$interval"

# セッションIDを保存
session_id=$(./scripts/auto_log_updater.sh status | grep "セッション ID:" | head -1 | awk '{print $3}' | sed 's/\x1b\[[0-9;]*m//g')

if [ -n "$session_id" ]; then
    # セッション情報をファイルに保存（クラッシュ対策）
    echo "$session_id" > "$HOME/.current_log_session"
    
    echo -e "\n${BLUE}💡 便利なコマンド:${NC}"
    echo -e "  状態確認: ${YELLOW}./scripts/auto_log_updater.sh status${NC}"
    echo -e "  停止: ${YELLOW}./scripts/auto_log_updater.sh stop $session_id${NC}"
    echo -e "  または: ${YELLOW}./scripts/stop_auto_log.sh${NC}"
    echo -e "\n${GREEN}ログは10分ごとに自動保存されます。${NC}"
    echo -e "${GREEN}クラッシュしても記録は残ります。${NC}"
fi