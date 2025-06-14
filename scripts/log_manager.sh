#!/bin/bash

# 作業ログ管理システム
# より高度な機能を持つログマネージャー

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# デフォルト設定
DEFAULT_LOG_DIR="$HOME/work_logs"
CONFIG_FILE="$HOME/.work_log_config"

# 設定読み込み
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    LOG_DIR="$DEFAULT_LOG_DIR"
fi

# 関数定義
show_help() {
    cat << EOF
作業ログ管理システム

使用方法:
    $0 [コマンド] [オプション]

コマンド:
    new <プロジェクト> <作業内容>    新しい作業ログを作成
    list [プロジェクト]              ログ一覧を表示
    search <キーワード>              ログを検索
    status <プロジェクト>            プロジェクトの状態を表示
    report <プロジェクト> [日付]     作業レポートを生成
    export <プロジェクト>            ログをエクスポート
    
オプション:
    -h, --help                       ヘルプを表示
    -d, --dir <ディレクトリ>         ログディレクトリを指定

例:
    $0 new "X_BUZZ_FLOW" "APIエンドポイントの実装"
    $0 list X_BUZZ_FLOW
    $0 search "エラー修正"
    $0 report X_BUZZ_FLOW 2024-06-14
EOF
}

# 新規ログ作成
create_new_log() {
    local project="$1"
    local description="$2"
    local date=$(date +"%Y-%m-%d")
    local time=$(date +"%H:%M:%S")
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    local project_dir="$LOG_DIR/$project"
    mkdir -p "$project_dir"
    
    local log_file="$project_dir/${date}_summary.md"
    local detail_file="$project_dir/details/${timestamp}_log.md"
    mkdir -p "$project_dir/details"
    
    # サマリーファイル作成/更新
    if [ ! -f "$log_file" ]; then
        cat > "$log_file" << EOF
# $project - $date

## 📊 作業サマリー

| 時刻 | 作業内容 | 状態 | 詳細 |
|------|----------|------|------|
EOF
    fi
    
    echo "| $time | $description | 🟡 進行中 | [詳細](details/${timestamp}_log.md) |" >> "$log_file"
    
    # 詳細ファイル作成
    cat > "$detail_file" << EOF
# 作業ログ: $description

**プロジェクト**: $project  
**開始時刻**: $date $time  
**作業者**: $(whoami)  
**環境**: $(uname -s) $(uname -r)  

## 📝 作業内容
$description

## ✅ 実施タスク
- [ ] 
- [ ] 
- [ ] 

## 🔧 技術詳細

### 使用コマンド
\`\`\`bash
# 
\`\`\`

### 変更ファイル
- 

## 🐛 発生した問題
### 問題1
- **症状**: 
- **原因**: 
- **解決策**: 

## 💡 学んだこと
- 

## 🚀 次のアクション
1. 
2. 
3. 

## 📚 参考資料
- [リンク名](URL)
- 

## 📸 スクリーンショット
<!-- 必要に応じて画像を追加 -->

---
*終了時刻*: <!-- 作業終了時に記入 -->  
*作業時間*: <!-- 作業終了時に計算 -->  
*ステータス*: 🟡 進行中
EOF

    echo -e "${GREEN}✅ ログを作成しました${NC}"
    echo -e "  📄 サマリー: $log_file"
    echo -e "  📋 詳細: $detail_file"
    
    # エディタで開くか確認
    echo -e "\n詳細ログを編集しますか? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        ${EDITOR:-code} "$detail_file"
    fi
}

# ログ一覧表示
list_logs() {
    local project="$1"
    
    if [ -z "$project" ]; then
        echo -e "${BLUE}=== 全プロジェクト一覧 ===${NC}"
        for proj in "$LOG_DIR"/*; do
            if [ -d "$proj" ]; then
                proj_name=$(basename "$proj")
                log_count=$(find "$proj" -name "*.md" | wc -l)
                echo -e "${YELLOW}$proj_name${NC} (${log_count} ログ)"
            fi
        done
    else
        local project_dir="$LOG_DIR/$project"
        if [ -d "$project_dir" ]; then
            echo -e "${BLUE}=== $project のログ一覧 ===${NC}"
            find "$project_dir" -name "*_summary.md" -type f | sort -r | while read -r file; do
                basename "$file"
            done
        else
            echo -e "${RED}プロジェクト '$project' が見つかりません${NC}"
        fi
    fi
}

# ログ検索
search_logs() {
    local keyword="$1"
    echo -e "${BLUE}=== '$keyword' の検索結果 ===${NC}"
    
    grep -r "$keyword" "$LOG_DIR" --include="*.md" | while IFS=: read -r file content; do
        file_rel=$(realpath --relative-to="$LOG_DIR" "$file")
        echo -e "${YELLOW}$file_rel${NC}"
        echo "  $content"
        echo
    done
}

# プロジェクト状態表示
show_status() {
    local project="$1"
    local project_dir="$LOG_DIR/$project"
    
    if [ ! -d "$project_dir" ]; then
        echo -e "${RED}プロジェクト '$project' が見つかりません${NC}"
        return 1
    fi
    
    echo -e "${BLUE}=== $project プロジェクト状態 ===${NC}"
    
    # 統計情報
    local total_logs=$(find "$project_dir" -name "*.md" | wc -l)
    local today_logs=$(find "$project_dir" -name "$(date +%Y-%m-%d)*.md" | wc -l)
    local in_progress=$(grep -r "🟡 進行中" "$project_dir" --include="*.md" | wc -l)
    local completed=$(grep -r "✅ 完了" "$project_dir" --include="*.md" | wc -l)
    
    echo "📊 統計情報:"
    echo "  総ログ数: $total_logs"
    echo "  今日のログ: $today_logs"
    echo "  進行中: $in_progress"
    echo "  完了: $completed"
    
    # 最近の活動
    echo -e "\n📅 最近の活動:"
    find "$project_dir" -name "*_summary.md" -type f | sort -r | head -5 | while read -r file; do
        echo "  - $(basename "$file" .md)"
    done
}

# レポート生成
generate_report() {
    local project="$1"
    local date="${2:-$(date +%Y-%m-%d)}"
    local project_dir="$LOG_DIR/$project"
    local report_file="$project_dir/reports/report_${date}.md"
    
    mkdir -p "$project_dir/reports"
    
    echo -e "${BLUE}=== $project レポート生成中 ($date) ===${NC}"
    
    cat > "$report_file" << EOF
# $project 作業レポート
**日付**: $date  
**生成日時**: $(date)  

## 📊 サマリー

### 作業時間
- 開始: 
- 終了: 
- 合計: 

### 完了タスク
EOF

    # その日のログから情報を抽出
    if [ -f "$project_dir/${date}_summary.md" ]; then
        echo -e "\n### 作業履歴" >> "$report_file"
        grep "^|" "$project_dir/${date}_summary.md" | grep -v "時刻" >> "$report_file"
    fi
    
    echo -e "\n## 📝 詳細" >> "$report_file"
    find "$project_dir/details" -name "${date//-/}*.md" -type f | while read -r detail; do
        echo -e "\n---\n" >> "$report_file"
        cat "$detail" >> "$report_file"
    done
    
    echo -e "${GREEN}✅ レポートを生成しました: $report_file${NC}"
}

# メイン処理
case "$1" in
    new)
        if [ $# -lt 3 ]; then
            echo -e "${RED}エラー: プロジェクト名と作業内容を指定してください${NC}"
            show_help
            exit 1
        fi
        create_new_log "$2" "$3"
        ;;
    list)
        list_logs "$2"
        ;;
    search)
        if [ -z "$2" ]; then
            echo -e "${RED}エラー: 検索キーワードを指定してください${NC}"
            exit 1
        fi
        search_logs "$2"
        ;;
    status)
        if [ -z "$2" ]; then
            echo -e "${RED}エラー: プロジェクト名を指定してください${NC}"
            exit 1
        fi
        show_status "$2"
        ;;
    report)
        if [ -z "$2" ]; then
            echo -e "${RED}エラー: プロジェクト名を指定してください${NC}"
            exit 1
        fi
        generate_report "$2" "$3"
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