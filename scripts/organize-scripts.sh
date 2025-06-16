#!/bin/bash

# スクリプト整理用のスクリプト
# テストスクリプトを適切なディレクトリに整理する

echo "=== X_BUZZ_FLOW Script Organization Tool ==="
echo "Starting at: $(date)"
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ディレクトリ作成
echo "${BLUE}Creating organized directory structure...${NC}"

mkdir -p tests/{unit,integration,debug,tools,archived}
mkdir -p tests/unit/{api,cot,db,search}
mkdir -p tests/integration/{flow,posting,auth}
mkdir -p tests/debug/{sessions,tasks,db}
mkdir -p tests/tools/{validation,migration,cleanup}

# 整理対象のスクリプトをリスト化
echo "${BLUE}Analyzing scripts to organize...${NC}"

# ルートディレクトリのテストスクリプト
ROOT_TEST_SCRIPTS=$(find . -maxdepth 1 -name "test-*.js" -o -name "test-*.sh" -o -name "check-*.js" -o -name "debug-*.js" -o -name "show-*.js" -o -name "find-*.js" | sort)

echo "Found $(echo "$ROOT_TEST_SCRIPTS" | wc -l) test scripts in root directory"

# カテゴリ分類関数
categorize_script() {
    local script=$1
    local basename=$(basename "$script")
    
    # CoT関連
    if [[ $basename == *"cot"* ]] || [[ $basename == *"phase"* ]] || [[ $basename == *"session"* ]]; then
        echo "cot"
    # DB関連
    elif [[ $basename == *"db"* ]] || [[ $basename == *"table"* ]] || [[ $basename == *"schema"* ]]; then
        echo "db"
    # API関連
    elif [[ $basename == *"api"* ]] || [[ $basename == *"perplexity"* ]] || [[ $basename == *"claude"* ]] || [[ $basename == *"openai"* ]]; then
        echo "api"
    # 検索関連
    elif [[ $basename == *"search"* ]] || [[ $basename == *"google"* ]] || [[ $basename == *"query"* ]]; then
        echo "search"
    # フロー関連
    elif [[ $basename == *"flow"* ]] || [[ $basename == *"complete"* ]] || [[ $basename == *"end-to-end"* ]]; then
        echo "flow"
    # 投稿関連
    elif [[ $basename == *"post"* ]] || [[ $basename == *"twitter"* ]] || [[ $basename == *"schedule"* ]]; then
        echo "posting"
    # 認証関連
    elif [[ $basename == *"auth"* ]] || [[ $basename == *"oauth"* ]]; then
        echo "auth"
    # デバッグツール
    elif [[ $basename == "debug-"* ]] || [[ $basename == "diagnose-"* ]]; then
        echo "debug"
    # チェックツール
    elif [[ $basename == "check-"* ]] || [[ $basename == "show-"* ]] || [[ $basename == "find-"* ]]; then
        echo "tools"
    else
        echo "misc"
    fi
}

# 整理プラン作成
echo ""
echo "${YELLOW}=== Organization Plan ===${NC}"
echo ""

declare -A categories
declare -A destinations

# 各スクリプトをカテゴリ分け
for script in $ROOT_TEST_SCRIPTS; do
    if [[ -f "$script" ]]; then
        category=$(categorize_script "$script")
        categories["$category"]="${categories["$category"]} $script"
        
        # 宛先決定
        case $category in
            "cot") dest="tests/unit/cot/" ;;
            "db") dest="tests/unit/db/" ;;
            "api") dest="tests/unit/api/" ;;
            "search") dest="tests/unit/search/" ;;
            "flow") dest="tests/integration/flow/" ;;
            "posting") dest="tests/integration/posting/" ;;
            "auth") dest="tests/integration/auth/" ;;
            "debug") dest="tests/debug/" ;;
            "tools") dest="tests/tools/validation/" ;;
            *) dest="tests/archived/" ;;
        esac
        
        destinations["$script"]=$dest
    fi
done

# カテゴリごとに表示
for cat in "${!categories[@]}"; do
    count=$(echo ${categories[$cat]} | wc -w)
    echo "${GREEN}$cat${NC}: $count scripts"
    
    # 最初の3つだけ表示
    i=0
    for script in ${categories[$cat]}; do
        if [ $i -lt 3 ]; then
            echo "  - $(basename $script) → ${destinations[$script]}"
            ((i++))
        fi
    done
    
    if [ $count -gt 3 ]; then
        echo "  ... and $((count - 3)) more"
    fi
    echo ""
done

# 実行確認
echo ""
echo "${YELLOW}This will move ${#destinations[@]} scripts to organized directories.${NC}"
echo "Do you want to proceed? (y/n)"
read -r response

if [[ "$response" != "y" ]]; then
    echo "Operation cancelled."
    exit 0
fi

# 実際の移動
echo ""
echo "${BLUE}Moving scripts...${NC}"

moved=0
errors=0

for script in "${!destinations[@]}"; do
    dest="${destinations[$script]}"
    basename=$(basename "$script")
    
    if [[ -f "$script" ]]; then
        if mv "$script" "$dest$basename" 2>/dev/null; then
            echo "${GREEN}✓${NC} Moved $basename to $dest"
            ((moved++))
        else
            echo "${RED}✗${NC} Failed to move $basename"
            ((errors++))
        fi
    fi
done

# scripts/ディレクトリの重複スクリプトも整理
echo ""
echo "${BLUE}Checking for duplicates in scripts/ directory...${NC}"

duplicates=0
for test_script in tests/*/*/*.js tests/*/*/*.sh; do
    if [[ -f "$test_script" ]]; then
        basename=$(basename "$test_script")
        script_file="scripts/$basename"
        
        if [[ -f "$script_file" ]]; then
            echo "${YELLOW}!${NC} Duplicate found: $basename"
            echo "   - Test version: $test_script"
            echo "   - Scripts version: $script_file"
            ((duplicates++))
        fi
    fi
done

# README作成
echo ""
echo "${BLUE}Creating README for test organization...${NC}"

cat > tests/README.md << 'EOF'
# Test Scripts Organization

## Directory Structure

```
tests/
├── unit/           # 単体テスト
│   ├── api/        # API関連テスト（Perplexity, OpenAI, Claude）
│   ├── cot/        # Chain of Thoughtテスト
│   ├── db/         # データベーステスト
│   └── search/     # 検索機能テスト
├── integration/    # 統合テスト
│   ├── flow/       # エンドツーエンドフロー
│   ├── posting/    # 投稿機能テスト
│   └── auth/       # 認証テスト
├── debug/          # デバッグツール
│   ├── sessions/   # セッションデバッグ
│   ├── tasks/      # タスクデバッグ
│   └── db/         # DBデバッグ
├── tools/          # ユーティリティツール
│   ├── validation/ # 検証ツール
│   ├── migration/  # マイグレーションツール
│   └── cleanup/    # クリーンアップツール
└── archived/       # アーカイブ（使用頻度の低いスクリプト）
```

## 使用方法

### 単体テストの実行
```bash
# 特定のCoTフェーズをテスト
node tests/unit/cot/test-phase1.js

# API接続テスト
node tests/unit/api/test-perplexity.js
```

### 統合テストの実行
```bash
# 完全なフローテスト
node tests/integration/flow/test-complete-flow.js

# 投稿フローテスト
node tests/integration/posting/test-posting-flow.js
```

### デバッグツールの使用
```bash
# セッション診断
node tests/debug/diagnose-session.js [sessionId]

# DB状態チェック
node tests/debug/check-db-state.js
```

## 命名規則

- `test-*.js` - テストスクリプト
- `check-*.js` - 状態確認スクリプト
- `debug-*.js` - デバッグスクリプト
- `show-*.js` - データ表示スクリプト
- `find-*.js` - 検索スクリプト

## メンテナンス

定期的に以下を実行：
1. 使用されていないスクリプトをarchived/に移動
2. 重複スクリプトの削除
3. READMEの更新
EOF

# 結果サマリー
echo ""
echo "${GREEN}=== Organization Complete ===${NC}"
echo "Moved: $moved scripts"
echo "Errors: $errors"
echo "Duplicates found: $duplicates"
echo ""
echo "New structure created in tests/ directory"
echo "Check tests/README.md for usage instructions"

# 推奨事項
echo ""
echo "${YELLOW}Recommendations:${NC}"
echo "1. Review duplicates and decide which version to keep"
echo "2. Update package.json scripts to use new paths"
echo "3. Consider removing archived scripts after review"
echo "4. Run 'git add tests/ && git rm <old-files>' to track changes"