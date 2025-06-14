#!/bin/bash

# シンプルな定期ログ更新スクリプト
# ポモドーロテクニック風の作業ログ記録

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# デフォルト設定
DEFAULT_WORK_TIME=25  # 作業時間（分）
DEFAULT_BREAK_TIME=5  # 休憩時間（分）
LOG_DIR="$HOME/work_logs"

# 音声通知関数（macOS用）
notify() {
    local message="$1"
    local title="${2:-作業ログ}"
    
    # macOSの場合
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "display notification \"$message\" with title \"$title\" sound name \"Glass\""
        say "$message"
    fi
    
    # Linuxの場合（notify-sendがインストールされている場合）
    if command -v notify-send &> /dev/null; then
        notify-send "$title" "$message"
    fi
}

# タイマー開始
start_timer() {
    local project="$1"
    local task="$2"
    local work_time="${3:-$DEFAULT_WORK_TIME}"
    local break_time="${4:-$DEFAULT_BREAK_TIME}"
    
    local date=$(date +"%Y-%m-%d")
    local session_start=$(date +"%H:%M:%S")
    local log_file="$LOG_DIR/$project/timer_logs/${date}_timer.md"
    
    mkdir -p "$LOG_DIR/$project/timer_logs"
    
    # ログファイル初期化
    if [ ! -f "$log_file" ]; then
        cat > "$log_file" << EOF
# $project タイマーログ - $date

## 🍅 ポモドーロセッション

EOF
    fi
    
    echo -e "${GREEN}🍅 ポモドーロタイマーを開始します${NC}"
    echo -e "  プロジェクト: ${YELLOW}$project${NC}"
    echo -e "  タスク: ${YELLOW}$task${NC}"
    echo -e "  作業時間: ${work_time}分 / 休憩時間: ${break_time}分"
    
    local session_num=1
    local total_work_time=0
    
    while true; do
        # セッション開始
        echo -e "\n${BLUE}=== セッション $session_num 開始 ===${NC}"
        local work_start=$(date +"%H:%M:%S")
        
        # ログに記録
        cat >> "$log_file" << EOF

### セッション $session_num
**開始**: $work_start  
**タスク**: $task  
EOF
        
        notify "作業を開始してください: $task" "🍅 ポモドーロ開始"
        
        # 作業時間カウントダウン
        for ((i=$work_time*60; i>0; i--)); do
            printf "\r${GREEN}作業中${NC}: %02d:%02d 残り" $((i/60)) $((i%60))
            sleep 1
        done
        
        echo -e "\n${YELLOW}🔔 作業時間終了！${NC}"
        notify "作業時間が終了しました。何を達成しましたか？" "⏰ 作業完了"
        
        # 達成内容を記録
        echo -e "\n達成した内容を入力してください:"
        read -r achievement
        echo "**達成内容**: $achievement" >> "$log_file"
        
        total_work_time=$((total_work_time + work_time))
        
        # 休憩するか確認
        echo -e "\n休憩を取りますか？ (y/n/q[終了])"
        read -r response
        
        if [[ "$response" == "q" ]]; then
            break
        elif [[ "$response" == "y" ]]; then
            echo -e "${BLUE}☕ ${break_time}分間の休憩${NC}"
            notify "${break_time}分間の休憩を取ってください" "☕ 休憩時間"
            
            # 休憩時間カウントダウン
            for ((i=$break_time*60; i>0; i--)); do
                printf "\r${BLUE}休憩中${NC}: %02d:%02d 残り" $((i/60)) $((i%60))
                sleep 1
            done
            
            echo -e "\n${GREEN}🔔 休憩終了！${NC}"
            notify "休憩が終了しました。次のセッションを開始しますか？" "⏰ 休憩終了"
        fi
        
        # 次のタスク
        echo -e "\n次のタスクを入力（同じ場合はEnter、終了は'q'）:"
        read -r new_task
        
        if [[ "$new_task" == "q" ]]; then
            break
        elif [ -n "$new_task" ]; then
            task="$new_task"
        fi
        
        session_num=$((session_num + 1))
    done
    
    # セッション終了
    local session_end=$(date +"%H:%M:%S")
    cat >> "$log_file" << EOF

## 📊 本日のサマリー
**開始時刻**: $session_start  
**終了時刻**: $session_end  
**総セッション数**: $session_num  
**総作業時間**: ${total_work_time}分  

### 振り返り
- 
- 
- 

---
EOF

    echo -e "\n${GREEN}✅ タイマーセッションを終了しました${NC}"
    echo -e "  総セッション数: $session_num"
    echo -e "  総作業時間: ${total_work_time}分"
    echo -e "  ログファイル: $log_file"
    
    notify "お疲れさまでした！総作業時間: ${total_work_time}分" "🎉 セッション終了"
}

# クイックタイマー（簡易版）
quick_timer() {
    local minutes="${1:-15}"
    local task="${2:-作業}"
    
    echo -e "${GREEN}⏱️  クイックタイマー: ${minutes}分${NC}"
    echo -e "タスク: ${YELLOW}$task${NC}"
    
    notify "$task を開始します（${minutes}分）" "⏱️ タイマー開始"
    
    # カウントダウン
    for ((i=$minutes*60; i>0; i--)); do
        printf "\r残り時間: %02d:%02d" $((i/60)) $((i%60))
        sleep 1
    done
    
    echo -e "\n${YELLOW}🔔 時間になりました！${NC}"
    notify "時間になりました！" "⏰ タイマー終了"
}

# 使い方
show_help() {
    cat << EOF
作業タイマー & ログシステム

使用方法:
    $0 start <プロジェクト> <タスク> [作業時間] [休憩時間]
    $0 quick <分数> [タスク名]
    
コマンド:
    start  - ポモドーロタイマーを開始（デフォルト: 25分作業/5分休憩）
    quick  - クイックタイマー（デフォルト: 15分）

例:
    $0 start "X_BUZZ_FLOW" "API実装" 25 5
    $0 start "X_BUZZ_FLOW" "バグ修正"      # デフォルト値使用
    $0 quick 10 "メールチェック"
    $0 quick 30                            # 30分のクイックタイマー

特徴:
    - 音声通知でお知らせ（macOS/Linux）
    - 達成内容の記録
    - 自動的にログファイルに保存
    - ポモドーロテクニック対応
EOF
}

# メイン処理
case "$1" in
    start)
        if [ $# -lt 3 ]; then
            echo -e "${RED}エラー: プロジェクト名とタスクを指定してください${NC}"
            show_help
            exit 1
        fi
        start_timer "$2" "$3" "$4" "$5"
        ;;
    quick)
        quick_timer "$2" "$3"
        ;;
    -h|--help|help|"")
        show_help
        ;;
    *)
        echo -e "${RED}不明なコマンド: $1${NC}"
        show_help
        exit 1
        ;;
esac