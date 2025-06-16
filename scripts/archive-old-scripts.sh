#!/bin/bash

# 古いスクリプトをアーカイブするスクリプト
# 重複や使用頻度の低いスクリプトを整理

echo "=== Script Archive Tool ==="
echo "Archiving old and duplicate scripts"
echo ""

# アーカイブディレクトリ作成
ARCHIVE_DIR="archived-scripts-$(date +%Y%m%d)"
mkdir -p "$ARCHIVE_DIR"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 重複スクリプトの検出
echo "${YELLOW}Finding duplicate scripts...${NC}"

declare -A script_groups

# すべてのスクリプトをベース名でグループ化
find . -name "test-*.js" -o -name "test-*.sh" -o -name "check-*.js" -o -name "debug-*.js" | while read -r script; do
    basename=$(basename "$script" | sed 's/-[0-9]\+\././g' | sed 's/-v[0-9]\+\././g' | sed 's/-old\././g' | sed 's/-new\././g' | sed 's/-fixed\././g' | sed 's/-working\././g')
    echo "$script" >> "/tmp/script_group_$basename.txt"
done

# 重複グループの処理
echo ""
echo "${YELLOW}Processing duplicate groups...${NC}"

duplicates_found=0
for group_file in /tmp/script_group_*.txt; do
    if [[ -f "$group_file" ]]; then
        count=$(wc -l < "$group_file")
        if [[ $count -gt 1 ]]; then
            ((duplicates_found++))
            basename=$(basename "$group_file" | sed 's/script_group_//g' | sed 's/.txt//g')
            echo ""
            echo "${GREEN}Duplicate group: $basename ($count files)${NC}"
            
            # 最新のファイルを見つける
            newest=""
            newest_time=0
            
            while IFS= read -r script; do
                if [[ -f "$script" ]]; then
                    mod_time=$(stat -f %m "$script" 2>/dev/null || stat -c %Y "$script" 2>/dev/null)
                    echo "  - $script (modified: $(date -r $mod_time 2>/dev/null || date -d @$mod_time 2>/dev/null))"
                    
                    if [[ $mod_time -gt $newest_time ]]; then
                        newest_time=$mod_time
                        newest=$script
                    fi
                fi
            done < "$group_file"
            
            echo "  ${GREEN}→ Newest: $newest${NC}"
            
            # 古いバージョンをアーカイブ
            while IFS= read -r script; do
                if [[ -f "$script" ]] && [[ "$script" != "$newest" ]]; then
                    echo "  ${YELLOW}→ Archiving: $script${NC}"
                    mkdir -p "$ARCHIVE_DIR/$(dirname "$script")"
                    mv "$script" "$ARCHIVE_DIR/$script"
                fi
            done < "$group_file"
        fi
        rm -f "$group_file"
    fi
done

# Perplexity関連の整理
echo ""
echo "${YELLOW}Organizing Perplexity test scripts...${NC}"

perplexity_scripts=$(find . -name "*perplexity*.js" | grep -E "(test-|check-)" | sort)
perplexity_count=$(echo "$perplexity_scripts" | wc -l)

if [[ $perplexity_count -gt 3 ]]; then
    echo "Found $perplexity_count Perplexity test scripts"
    echo "Keeping the 3 most recent, archiving the rest..."
    
    # 最新の3つ以外をアーカイブ
    echo "$perplexity_scripts" | head -n -3 | while read -r script; do
        if [[ -f "$script" ]]; then
            echo "  ${YELLOW}→ Archiving: $script${NC}"
            mkdir -p "$ARCHIVE_DIR/$(dirname "$script")"
            mv "$script" "$ARCHIVE_DIR/$script"
        fi
    done
fi

# Phase関連の整理
echo ""
echo "${YELLOW}Organizing Phase test scripts...${NC}"

for phase in 1 2 3 4 5; do
    phase_scripts=$(find . -name "*phase${phase}*.js" | grep -E "(test-|check-)" | sort)
    phase_count=$(echo "$phase_scripts" | wc -l)
    
    if [[ $phase_count -gt 2 ]]; then
        echo "Phase $phase: Found $phase_count test scripts, keeping 2 most recent"
        
        echo "$phase_scripts" | head -n -2 | while read -r script; do
            if [[ -f "$script" ]]; then
                echo "  ${YELLOW}→ Archiving: $script${NC}"
                mkdir -p "$ARCHIVE_DIR/$(dirname "$script")"
                mv "$script" "$ARCHIVE_DIR/$script"
            fi
        done
    fi
done

# 明らかに古いスクリプトのパターン
echo ""
echo "${YELLOW}Archiving obviously old scripts...${NC}"

old_patterns=(
    "*-old.js"
    "*-backup.js"
    "*-orig.js"
    "*-deprecated.js"
    "*-broken.js"
    "test-*-v[0-9].js"
    "*-temp.js"
)

for pattern in "${old_patterns[@]}"; do
    find . -name "$pattern" | while read -r script; do
        if [[ -f "$script" ]]; then
            echo "  ${YELLOW}→ Archiving: $script${NC}"
            mkdir -p "$ARCHIVE_DIR/$(dirname "$script")"
            mv "$script" "$ARCHIVE_DIR/$script"
        fi
    done
done

# 統計情報の作成
echo ""
echo "${GREEN}Creating archive statistics...${NC}"

cat > "$ARCHIVE_DIR/ARCHIVE_INFO.md" << EOF
# Archived Scripts

Archive created on: $(date)

## Summary
- Total scripts archived: $(find "$ARCHIVE_DIR" -name "*.js" -o -name "*.sh" | wc -l)
- Duplicate groups found: $duplicates_found

## Archive Reason
These scripts were archived because they were:
1. Duplicates of newer versions
2. Explicitly marked as old/deprecated
3. Excessive test variations (kept only recent versions)

## Restoration
To restore a script:
\`\`\`bash
cp archived-scripts-$(date +%Y%m%d)/path/to/script.js ./path/to/script.js
\`\`\`

## Recommendation
Review this archive in 30 days and permanently delete if no issues arise.
EOF

# 最終レポート
echo ""
echo "${GREEN}=== Archive Complete ===${NC}"
echo "Archived scripts moved to: $ARCHIVE_DIR/"
echo "Total archived: $(find "$ARCHIVE_DIR" -name "*.js" -o -name "*.sh" | wc -l)"
echo ""
echo "${YELLOW}Next steps:${NC}"
echo "1. Review $ARCHIVE_DIR/ARCHIVE_INFO.md"
echo "2. Run './scripts/organize-scripts.sh' to organize remaining scripts"
echo "3. Commit changes: git add -A && git commit -m 'chore: archive old test scripts'"