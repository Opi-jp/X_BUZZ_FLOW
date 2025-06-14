#!/bin/bash

# 自動ログ更新スクリプト
# 一定間隔で作業ログを自動更新

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# デフォルト設定
DEFAULT_INTERVAL=600  # 10分（秒単位）
LOG_DIR="$HOME/work_logs"
TEMP_DIR="/tmp/work_log_sessions"
mkdir -p "$TEMP_DIR"

show_help() {
    cat << EOF
自動ログ更新システム

使用方法:
    $0 start <プロジェクト> <作業内容> [間隔(分)]
    $0 stop [セッションID]
    $0 status
    $0 list

コマンド:
    start    - 新しい自動ログセッションを開始
    stop     - セッションを停止
    status   - アクティブなセッション一覧
    list     - 全セッション履歴

例:
    $0 start "X_BUZZ_FLOW" "API実装" 15     # 15分間隔で更新
    $0 start "X_BUZZ_FLOW" "バグ修正"       # デフォルト10分間隔
    $0 stop 12345                            # セッションID指定で停止
    $0 stop                                  # 最新セッションを停止
EOF
}

# セッション開始
start_session() {
    local project="$1"
    local description="$2"
    local interval_min="${3:-10}"
    local interval_sec=$((interval_min * 60))
    local session_id="$$"
    local session_file="$TEMP_DIR/session_${session_id}.info"
    local start_time=$(date +"%Y-%m-%d %H:%M:%S")
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    # セッション情報を保存
    cat > "$session_file" << EOF
PROJECT=$project
DESCRIPTION=$description
START_TIME=$start_time
INTERVAL=$interval_min
LOG_FILE=$LOG_DIR/$project/auto_logs/${timestamp}_session.md
PID=$$
STATUS=ACTIVE
EOF

    # ログディレクトリ作成
    mkdir -p "$LOG_DIR/$project/auto_logs"
    local log_file="$LOG_DIR/$project/auto_logs/${timestamp}_session.md"
    
    # 初期ログ作成
    cat > "$log_file" << EOF
# 自動ログセッション: $description

**プロジェクト**: $project  
**開始時刻**: $start_time  
**更新間隔**: ${interval_min}分  
**セッションID**: $session_id  

## 📊 作業進捗

| 時刻 | 経過時間 | アクティビティ | メモ |
|------|----------|----------------|------|
| $(date +"%H:%M:%S") | 0分 | セッション開始 | $description |
EOF

    echo -e "${GREEN}✅ 自動ログセッションを開始しました${NC}"
    echo -e "  📝 プロジェクト: ${YELLOW}$project${NC}"
    echo -e "  🎯 作業内容: ${YELLOW}$description${NC}"
    echo -e "  ⏱️  更新間隔: ${YELLOW}${interval_min}分${NC}"
    echo -e "  🔖 セッションID: ${CYAN}$session_id${NC}"
    echo -e "  📄 ログファイル: $log_file"
    
    # バックグラウンドで更新プロセスを開始
    (
        trap 'echo "セッション $session_id を終了します"; exit 0' SIGTERM
        
        while true; do
            sleep "$interval_sec"
            
            # セッションファイルが存在しない場合は終了
            if [ ! -f "$session_file" ]; then
                break
            fi
            
            # 経過時間計算
            local elapsed=$(($(date +%s) - $(date -d "$start_time" +%s)))
            local elapsed_min=$((elapsed / 60))
            local elapsed_hour=$((elapsed_min / 60))
            local elapsed_min_rem=$((elapsed_min % 60))
            
            if [ $elapsed_hour -gt 0 ]; then
                local elapsed_str="${elapsed_hour}時間${elapsed_min_rem}分"
            else
                local elapsed_str="${elapsed_min}分"
            fi
            
            # 更新プロンプト
            echo -e "\n${BLUE}[自動更新] $(date +"%H:%M:%S")${NC}"
            echo -e "${YELLOW}セッション: $session_id - $description${NC}"
            echo -e "経過時間: $elapsed_str"
            
            # アクティビティ入力
            local activity=""
            local memo=""
            
            # クラッシュ対策：現在の状態を一時ファイルに保存
            echo "SESSION=$session_id" > "$TEMP_DIR/current_update_${session_id}.tmp"
            echo "TIME=$(date)" >> "$TEMP_DIR/current_update_${session_id}.tmp"
            
            # タイムアウト付きで入力を待つ（30秒）
            echo -e "\n現在の作業内容を入力（30秒でスキップ）:"
            if read -t 30 -r activity; then
                if [ -n "$activity" ]; then
                    echo "メモ（オプション）:"
                    read -t 10 -r memo
                else
                    activity="作業継続中"
                fi
            else
                activity="自動記録"
                memo="（入力なし）"
            fi
            
            # 一時ファイルを削除
            rm -f "$TEMP_DIR/current_update_${session_id}.tmp"
            
            # ログに追記
            echo "| $(date +"%H:%M:%S") | $elapsed_str | $activity | $memo |" >> "$log_file"
            
            echo -e "${GREEN}✅ ログを更新しました${NC}"
            
            # Git自動コミット（オプション）
            if [ -d "$LOG_DIR/.git" ]; then
                (cd "$LOG_DIR" && git add . && git commit -m "Auto-update: $project - $description" &>/dev/null)
            fi
            
        done
    ) &
    
    # バックグラウンドプロセスIDを保存
    echo "BG_PID=$!" >> "$session_file"
    
    echo -e "\n${CYAN}💡 ヒント:${NC}"
    echo "  - 更新時に入力がない場合は自動的にスキップされます"
    echo "  - 停止するには: $0 stop $session_id"
    echo "  - ステータス確認: $0 status"
}

# セッション停止
stop_session() {
    local session_id="$1"
    
    if [ -z "$session_id" ]; then
        # 最新のアクティブセッションを取得
        session_id=$(ls -t "$TEMP_DIR"/session_*.info 2>/dev/null | head -1 | grep -o '[0-9]*' | head -1)
        if [ -z "$session_id" ]; then
            echo -e "${RED}アクティブなセッションがありません${NC}"
            return 1
        fi
    fi
    
    local session_file="$TEMP_DIR/session_${session_id}.info"
    
    if [ ! -f "$session_file" ]; then
        echo -e "${RED}セッション $session_id が見つかりません${NC}"
        return 1
    fi
    
    # セッション情報を読み込み
    source "$session_file"
    
    # バックグラウンドプロセスを終了
    if [ -n "$BG_PID" ]; then
        kill "$BG_PID" 2>/dev/null
    fi
    
    # 終了時刻を記録
    local end_time=$(date +"%Y-%m-%d %H:%M:%S")
    local elapsed=$(($(date +%s) - $(date -d "$START_TIME" +%s)))
    local total_hours=$((elapsed / 3600))
    local total_mins=$(((elapsed % 3600) / 60))
    
    # ログファイルに終了情報を追記
    cat >> "$LOG_FILE" << EOF

## 📊 セッションサマリー

**終了時刻**: $end_time  
**総作業時間**: ${total_hours}時間${total_mins}分  
**ステータス**: ✅ 完了  

### 振り返り
- 達成したこと: 
- 課題・問題点: 
- 次回の課題: 

---
*自動ログセッション終了*
EOF

    # セッションファイルを削除
    rm -f "$session_file"
    
    echo -e "${GREEN}✅ セッション $session_id を停止しました${NC}"
    echo -e "  📊 総作業時間: ${total_hours}時間${total_mins}分"
    echo -e "  📄 ログファイル: $LOG_FILE"
}

# ステータス表示
show_status() {
    echo -e "${BLUE}=== アクティブなログセッション ===${NC}"
    
    local found=0
    for session_file in "$TEMP_DIR"/session_*.info; do
        if [ -f "$session_file" ]; then
            found=1
            source "$session_file"
            local session_id=$(basename "$session_file" | grep -o '[0-9]*')
            local elapsed=$(($(date +%s) - $(date -d "$START_TIME" +%s)))
            local elapsed_min=$((elapsed / 60))
            
            echo -e "\n${YELLOW}セッション ID: $session_id${NC}"
            echo "  プロジェクト: $PROJECT"
            echo "  作業内容: $DESCRIPTION"
            echo "  開始時刻: $START_TIME"
            echo "  経過時間: ${elapsed_min}分"
            echo "  更新間隔: ${INTERVAL}分"
            echo "  ログ: $LOG_FILE"
        fi
    done
    
    if [ $found -eq 0 ]; then
        echo -e "${YELLOW}アクティブなセッションはありません${NC}"
    fi
}

# セッション履歴
list_sessions() {
    echo -e "${BLUE}=== セッション履歴 ===${NC}"
    
    find "$LOG_DIR" -path "*/auto_logs/*_session.md" -type f | sort -r | while read -r log_file; do
        if [ -f "$log_file" ]; then
            local project=$(basename $(dirname $(dirname "$log_file")))
            local filename=$(basename "$log_file")
            local date=$(echo "$filename" | cut -d'_' -f1)
            local time=$(echo "$filename" | cut -d'_' -f2)
            
            # ログファイルから情報を抽出
            local description=$(grep "^# 自動ログセッション:" "$log_file" | cut -d: -f2- | xargs)
            local status="✅ 完了"
            
            # アクティブかチェック
            for session_file in "$TEMP_DIR"/session_*.info; do
                if [ -f "$session_file" ]; then
                    source "$session_file"
                    if [ "$LOG_FILE" = "$log_file" ]; then
                        status="🟡 アクティブ"
                        break
                    fi
                fi
            done
            
            echo -e "\n${YELLOW}$project${NC} - $description"
            echo "  日時: $date $time"
            echo "  状態: $status"
            echo "  ファイル: $log_file"
        fi
    done
}

# メイン処理
case "$1" in
    start)
        if [ $# -lt 3 ]; then
            echo -e "${RED}エラー: プロジェクト名と作業内容を指定してください${NC}"
            show_help
            exit 1
        fi
        start_session "$2" "$3" "$4"
        ;;
    stop)
        stop_session "$2"
        ;;
    status)
        show_status
        ;;
    list)
        list_sessions
        ;;
    -h|--help|help)
        show_help
        ;;
    *)
        echo -e "${RED}不明なコマンド: $1${NC}"
        show_help
        exit 1
        ;;
esac