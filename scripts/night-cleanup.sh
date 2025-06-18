#\!/bin/bash

echo "🌙 夜間ファイル整理を開始します..."
echo "開始時刻: $(date)"

# 1. アーカイブディレクトリの作成
echo "📁 アーカイブディレクトリを作成..."
mkdir -p test-scripts/archive
mkdir -p app/archive
mkdir -p docs/archive

# 2. テストスクリプトの整理
echo "🧪 テストスクリプトを整理中..."
cd test-scripts

# 最新30ファイルのリストを作成
ls -t *.js 2>/dev/null | head -30 > ../keep_files.txt

# 古いファイルをアーカイブ
for file in *.js; do
    if \! grep -q "^$file$" ../keep_files.txt; then
        echo "  アーカイブ: $file"
        mv "$file" archive/ 2>/dev/null
    fi
done

cd ..
rm keep_files.txt

# 3. 重複テストスクリプトの整理
echo "🔍 重複ファイルを検索中..."
cd test-scripts
for base in cardi buzz viral news; do
    # 各ベース名のファイルをバージョン順にソート
    ls -t test-${base}-*.js 2>/dev/null | tail -n +2 | while read file; do
        echo "  重複アーカイブ: $file"
        mv "$file" archive/ 2>/dev/null
    done
done
cd ..

# 4. 統計を表示
echo ""
echo "📊 整理結果:"
echo "  - アクティブなテストスクリプト: $(ls test-scripts/*.js 2>/dev/null | wc -l)"
echo "  - アーカイブしたスクリプト: $(ls test-scripts/archive/*.js 2>/dev/null | wc -l)"

echo ""
echo "✅ ファイル整理が完了しました！"
echo "完了時刻: $(date)"
