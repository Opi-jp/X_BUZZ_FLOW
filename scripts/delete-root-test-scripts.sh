#!/bin/bash

# ルートディレクトリのテストスクリプトを削除するシンプルなスクリプト
# scriptsディレクトリ内のスクリプトは触らない

echo "=== Delete Root Test Scripts ==="
echo "This will delete test scripts in the root directory only"
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ルートディレクトリのテストスクリプトを検索
ROOT_TEST_SCRIPTS=$(find . -maxdepth 1 -type f \( -name "test-*.js" -o -name "check-*.js" -o -name "show-*.js" -o -name "find-*.js" -o -name "debug-*.js" -o -name "list-*.js" -o -name "create-test-*.js" -o -name "fix-test-*.js" \) | sort)

# カウント
COUNT=$(echo "$ROOT_TEST_SCRIPTS" | grep -v '^$' | wc -l)

echo "Found ${COUNT} test scripts in root directory:"
echo ""

# リスト表示
echo "$ROOT_TEST_SCRIPTS" | head -20
if [[ $COUNT -gt 20 ]]; then
    echo "... and $((COUNT - 20)) more files"
fi

echo ""
echo "${RED}WARNING: This will delete all test scripts in the root directory!${NC}"
echo "Scripts in the scripts/ directory will NOT be affected."
echo ""
echo "Do you want to DELETE these ${COUNT} files? (yes/no)"
read -r response

if [[ "$response" != "yes" ]]; then
    echo "Operation cancelled."
    exit 0
fi

# 削除実行
echo ""
echo "${YELLOW}Deleting files...${NC}"

deleted=0
failed=0

while IFS= read -r file; do
    if [[ -n "$file" ]] && [[ -f "$file" ]]; then
        if rm -f "$file" 2>/dev/null; then
            ((deleted++))
            echo -n "."
        else
            ((failed++))
            echo ""
            echo "${RED}Failed to delete: $file${NC}"
        fi
    fi
done <<< "$ROOT_TEST_SCRIPTS"

echo ""
echo ""
echo "${GREEN}=== Cleanup Complete ===${NC}"
echo "Deleted: $deleted files"
if [[ $failed -gt 0 ]]; then
    echo "${RED}Failed: $failed files${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Run './scripts/organize-scripts.sh' to organize remaining scripts"
echo "2. Review scripts/ directory for any outdated test scripts"
echo "3. Commit changes: git add -A && git commit -m 'chore: cleanup root test scripts'"