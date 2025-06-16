#!/bin/bash

# テストスクリプトのクリーンアップ
# 重複・古い・不要なスクリプトを削除

echo "=== Test Script Cleanup Tool ==="
echo "This will DELETE duplicate and old test scripts"
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 削除対象リスト
TO_DELETE=()

# 1. 明らかに古いスクリプト
echo "${YELLOW}Finding obviously old scripts...${NC}"
OLD_PATTERNS=(
    "*-old.js"
    "*-old.sh"
    "*-backup.js"
    "*-orig.js"
    "*-deprecated.js"
    "*-broken.js"
    "*-temp.js"
    "*-tmp.js"
    "*-copy.js"
    "*-v[0-9].js"
    "*-v[0-9].sh"
    "*-fixed.js"
    "*-working.js"
    "*-new.js"
)

for pattern in "${OLD_PATTERNS[@]}"; do
    while IFS= read -r file; do
        if [[ -f "$file" ]] && [[ ! "$file" =~ node_modules ]]; then
            # async-worker-v2.jsは除外（重要なファイル）
            if [[ "$file" != "./scripts/async-worker-v2.js" ]]; then
                TO_DELETE+=("$file")
                echo "  ${RED}✗${NC} $file (old/backup)"
            fi
        fi
    done < <(find . -name "$pattern" -type f -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*")
done

# 2. Perplexity重複テスト
echo ""
echo "${YELLOW}Finding Perplexity duplicates...${NC}"
PERPLEXITY_TESTS=$(find . -name "*perplexity*.js" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" | grep -E "(test-|check-)" | sort -r)

# 最新の2つ以外を削除
count=0
while IFS= read -r file; do
    if [[ -f "$file" ]]; then
        ((count++))
        if [[ $count -gt 2 ]]; then
            TO_DELETE+=("$file")
            echo "  ${RED}✗${NC} $file (excess perplexity test)"
        else
            echo "  ${GREEN}✓${NC} $file (keeping)"
        fi
    fi
done <<< "$PERPLEXITY_TESTS"

# 3. Phase重複テスト
echo ""
echo "${YELLOW}Finding Phase test duplicates...${NC}"
for phase in 1 2 3 4 5; do
    PHASE_TESTS=$(find . -name "*phase${phase}*.js" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" | grep -E "(test-|check-)" | sort -r)
    
    count=0
    while IFS= read -r file; do
        if [[ -f "$file" ]]; then
            ((count++))
            if [[ $count -gt 1 ]]; then
                TO_DELETE+=("$file")
                echo "  ${RED}✗${NC} $file (excess phase $phase test)"
            else
                echo "  ${GREEN}✓${NC} $file (keeping)"
            fi
        fi
    done <<< "$PHASE_TESTS"
done

# 4. CoT重複テスト
echo ""
echo "${YELLOW}Finding CoT test duplicates...${NC}"
COT_TESTS=$(find . -name "*cot*.js" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" | grep -E "(test-)" | grep -v phase | sort -r)

count=0
while IFS= read -r file; do
    if [[ -f "$file" ]]; then
        ((count++))
        if [[ $count -gt 3 ]]; then
            TO_DELETE+=("$file")
            echo "  ${RED}✗${NC} $file (excess CoT test)"
        else
            echo "  ${GREEN}✓${NC} $file (keeping)"
        fi
    fi
done <<< "$COT_TESTS"

# 5. セッション関連の重複
echo ""
echo "${YELLOW}Finding session check duplicates...${NC}"
SESSION_CHECKS=$(find . -name "*session*.js" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" | grep -E "(check-|show-|find-)" | sort -r)

# セッション関連のタイプ別管理
check_scripts=""
show_scripts=""
find_scripts=""
while IFS= read -r file; do
    if [[ -f "$file" ]]; then
        # ファイル名からタイプを抽出
        basename=$(basename "$file")
        type=""
        
        if [[ $basename == check-* ]]; then
            check_scripts="$check_scripts $file"
        elif [[ $basename == show-* ]]; then
            show_scripts="$show_scripts $file"
        elif [[ $basename == find-* ]]; then
            find_scripts="$find_scripts $file"
        fi
    fi
done <<< "$SESSION_CHECKS"

# 各タイプで最新の1つだけ保持
count=0
for file in $check_scripts; do
    ((count++))
    if [[ $count -gt 1 ]]; then
        TO_DELETE+=("$file")
        echo "  ${RED}✗${NC} $file (excess check session script)"
    else
        echo "  ${GREEN}✓${NC} $file (keeping)"
    fi
done

count=0
for file in $show_scripts; do
    ((count++))
    if [[ $count -gt 1 ]]; then
        TO_DELETE+=("$file")
        echo "  ${RED}✗${NC} $file (excess show session script)"
    else
        echo "  ${GREEN}✓${NC} $file (keeping)"
    fi
done

count=0
for file in $find_scripts; do
    ((count++))
    if [[ $count -gt 1 ]]; then
        TO_DELETE+=("$file")
        echo "  ${RED}✗${NC} $file (excess find session script)"
    else
        echo "  ${GREEN}✓${NC} $file (keeping)"
    fi
done

# 6. 特定の不要なスクリプト
echo ""
echo "${YELLOW}Finding specific unnecessary scripts...${NC}"
UNNECESSARY=(
    "./test-simple.js"
    "./test.js"
    "./temp.js"
    "./debug.js"
)

for file in "${UNNECESSARY[@]}"; do
    if [[ -f "$file" ]]; then
        TO_DELETE+=("$file")
        echo "  ${RED}✗${NC} $file (generic/unnecessary)"
    fi
done

# 削除確認
echo ""
echo "${RED}=== DELETION SUMMARY ===${NC}"
echo "Total files to delete: ${#TO_DELETE[@]}"
echo ""

if [[ ${#TO_DELETE[@]} -eq 0 ]]; then
    echo "${GREEN}No files to delete. Scripts are already clean!${NC}"
    exit 0
fi

# 削除リストの表示（最初の10個）
echo "Files to be deleted:"
count=0
for file in "${TO_DELETE[@]}"; do
    ((count++))
    if [[ $count -le 10 ]]; then
        echo "  - $file"
    fi
done

if [[ ${#TO_DELETE[@]} -gt 10 ]]; then
    echo "  ... and $((${#TO_DELETE[@]} - 10)) more files"
fi

# 最終確認
echo ""
echo "${RED}WARNING: This action cannot be undone!${NC}"
echo "Do you want to DELETE these ${#TO_DELETE[@]} files? (yes/no)"
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

for file in "${TO_DELETE[@]}"; do
    if rm -f "$file" 2>/dev/null; then
        ((deleted++))
        echo -n "."
    else
        ((failed++))
        echo ""
        echo "${RED}Failed to delete: $file${NC}"
    fi
done

echo ""
echo ""
echo "${GREEN}=== Cleanup Complete ===${NC}"
echo "Deleted: $deleted files"
if [[ $failed -gt 0 ]]; then
    echo "${RED}Failed: $failed files${NC}"
fi

# 残りのテストスクリプトを整理
echo ""
echo "${BLUE}Organizing remaining test scripts...${NC}"

# テスト用ディレクトリ作成
mkdir -p tests/{api,cot,db,integration,tools}

# 残ったスクリプトを適切な場所に移動
echo "Moving remaining test scripts to organized directories..."

# APIテスト
find . -maxdepth 1 \( -name "test-*api*.js" -o -name "test-*perplexity*.js" -o -name "test-*claude*.js" \) | while read -r file; do
    if [[ -f "$file" ]]; then
        mv "$file" tests/api/ 2>/dev/null && echo "  → tests/api/$(basename "$file")"
    fi
done

# CoTテスト
find . -maxdepth 1 \( -name "test-*cot*.js" -o -name "test-*phase*.js" \) | while read -r file; do
    if [[ -f "$file" ]]; then
        mv "$file" tests/cot/ 2>/dev/null && echo "  → tests/cot/$(basename "$file")"
    fi
done

# DBテスト
find . -maxdepth 1 \( -name "test-*db*.js" -o -name "check-*table*.js" \) | while read -r file; do
    if [[ -f "$file" ]]; then
        mv "$file" tests/db/ 2>/dev/null && echo "  → tests/db/$(basename "$file")"
    fi
done

# 統合テスト
find . -maxdepth 1 \( -name "test-*flow*.js" -o -name "test-*complete*.js" \) | while read -r file; do
    if [[ -f "$file" ]]; then
        mv "$file" tests/integration/ 2>/dev/null && echo "  → tests/integration/$(basename "$file")"
    fi
done

# ツール類
find . -maxdepth 1 \( -name "check-*.js" -o -name "show-*.js" -o -name "find-*.js" \) | while read -r file; do
    if [[ -f "$file" ]]; then
        mv "$file" tests/tools/ 2>/dev/null && echo "  → tests/tools/$(basename "$file")"
    fi
done

echo ""
echo "${GREEN}✅ Cleanup and organization complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review tests/ directory for organized scripts"
echo "2. Update any references to moved scripts"
echo "3. Commit changes: git add -A && git commit -m 'chore: cleanup and organize test scripts'"