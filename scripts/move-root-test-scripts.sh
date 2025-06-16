#!/bin/bash

# ルートディレクトリのテストスクリプトをtest-scriptsに移動する

echo "=== Move Root Test Scripts ==="
echo "This will move test scripts from root to test-scripts/"
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# test-scriptsディレクトリを作成（既存なら無視）
mkdir -p test-scripts

# ルートディレクトリのテストスクリプトを検索
ROOT_TEST_SCRIPTS=$(find . -maxdepth 1 -type f \( -name "test-*.js" -o -name "check-*.js" -o -name "show-*.js" -o -name "find-*.js" -o -name "debug-*.js" -o -name "list-*.js" -o -name "create-test-*.js" -o -name "fix-test-*.js" \) | sort)

# カウント
COUNT=$(echo "$ROOT_TEST_SCRIPTS" | grep -v '^$' | wc -l)

echo "Found ${COUNT} test scripts in root directory"
echo ""

# 移動実行
echo "${YELLOW}Moving files to test-scripts/...${NC}"

moved=0
failed=0

while IFS= read -r file; do
    if [[ -n "$file" ]] && [[ -f "$file" ]]; then
        basename=$(basename "$file")
        if mv "$file" "test-scripts/$basename" 2>/dev/null; then
            ((moved++))
            echo -n "."
        else
            ((failed++))
            echo ""
            echo "${RED}Failed to move: $file${NC}"
        fi
    fi
done <<< "$ROOT_TEST_SCRIPTS"

echo ""
echo ""
echo "${GREEN}=== Move Complete ===${NC}"
echo "Moved: $moved files"
if [[ $failed -gt 0 ]]; then
    echo "${RED}Failed: $failed files${NC}"
fi

# SQLファイルも移動
echo ""
echo "${YELLOW}Moving SQL files...${NC}"
SQL_FILES=$(find . -maxdepth 1 -name "*.sql" | sort)
SQL_COUNT=$(echo "$SQL_FILES" | grep -v '^$' | wc -l)

if [[ $SQL_COUNT -gt 0 ]]; then
    mkdir -p sql-scripts
    echo "Found $SQL_COUNT SQL files"
    
    while IFS= read -r file; do
        if [[ -n "$file" ]] && [[ -f "$file" ]]; then
            basename=$(basename "$file")
            if mv "$file" "sql-scripts/$basename" 2>/dev/null; then
                echo "${GREEN}✓${NC} Moved $basename to sql-scripts/"
            fi
        fi
    done <<< "$SQL_FILES"
fi

echo ""
echo "Next steps:"
echo "1. Review test-scripts/ directory"
echo "2. Delete old/duplicate scripts in test-scripts/"
echo "3. Commit changes: git add -A && git commit -m 'chore: organize test scripts'"