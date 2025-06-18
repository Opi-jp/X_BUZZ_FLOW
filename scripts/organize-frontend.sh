#!/bin/bash

echo "🎨 フロントエンド整理を開始..."

# 1. 使われていないページを特定
echo "📝 使用状況を調査中..."

# 重複している機能をリストアップ
cat > duplicate_pages.txt << 'EOF'
# 重複ページリスト
app/viral/cot-step/page.tsx
app/viral/enhanced/page.tsx
app/viral/summary/page.tsx
app/viral-test/page.tsx
EOF

# 2. 重複ページをアーカイブ
mkdir -p app/archive/viral

while IFS= read -r page; do
    if [[ ! "$page" =~ ^# ]] && [[ -n "$page" ]]; then
        if [[ -f "$page" ]]; then
            echo "  アーカイブ: $page"
            mkdir -p "app/archive/$(dirname ${page#app/})"
            mv "$page" "app/archive/${page#app/}" 2>/dev/null
        fi
    fi
done < duplicate_pages.txt

rm duplicate_pages.txt

# 3. ドキュメントの整理
echo "📚 ドキュメントを整理中..."

# 古いバージョンをアーカイブ
cd docs
for file in *.md; do
    # current/に既にあるファイルはスキップ
    if [[ -f "current/$file" ]]; then
        echo "  アーカイブ: $file (最新版はcurrent/にあります)"
        mv "$file" archive/ 2>/dev/null
    fi
done

# archiveディレクトリ内の重複を確認
cd archive
for base in "chain-of-thought"; do
    count=$(ls ${base}*.md 2>/dev/null | wc -l)
    if [[ $count -gt 1 ]]; then
        echo "  ${base}の複数バージョンを検出: $count files"
        # 最新のものだけ残す
        ls -t ${base}*.md 2>/dev/null | tail -n +2 | while read old; do
            echo "    古いバージョンを削除: $old"
            rm "$old"
        done
    fi
done
cd ../..

# 4. 統計
echo ""
echo "📊 整理結果:"
echo "  - アクティブなドキュメント: $(find docs -name "*.md" -not -path "*/archive/*" | wc -l)"
echo "  - アーカイブしたドキュメント: $(find docs/archive -name "*.md" 2>/dev/null | wc -l)"
echo "  - アクティブなviralページ: $(find app/viral -name "page.tsx" | wc -l)"

echo "✅ フロントエンド整理完了！"