#!/bin/bash

# テストスクリプト整理ツール
# 309個のテストファイルを整理・統合する

set -e

PROJECT_ROOT="/Users/yukio/X_BUZZ_FLOW"
TEST_DIR="$PROJECT_ROOT/test-scripts"
ORGANIZED_DIR="$PROJECT_ROOT/test-scripts-organized"

echo "🧹 テストスクリプト整理開始..."
echo "現在のテストファイル数: $(find $TEST_DIR -name "*.js" | wc -l)"

# 新しいディレクトリ構造を作成
mkdir -p "$ORGANIZED_DIR"/{api,character,cot,db,integration,perplexity,twitter,archive}

# ファイル分類関数
classify_and_move() {
    local file="$1"
    local basename=$(basename "$file")
    local moved=false
    
    # API関連
    if [[ $basename =~ test-api|test-.*-api|api-.*test ]]; then
        mv "$file" "$ORGANIZED_DIR/api/"
        moved=true
    # キャラクター関連
    elif [[ $basename =~ test-character|test-cardi|character.*test ]]; then
        mv "$file" "$ORGANIZED_DIR/character/"
        moved=true
    # Chain of Thought関連
    elif [[ $basename =~ test-cot|test-phase|cot.*test|check.*phase ]]; then
        mv "$file" "$ORGANIZED_DIR/cot/"
        moved=true
    # データベース関連
    elif [[ $basename =~ test-db|test.*connection|check.*db|db.*test ]]; then
        mv "$file" "$ORGANIZED_DIR/db/"
        moved=true
    # Perplexity関連
    elif [[ $basename =~ test-perplexity|perplexity.*test ]]; then
        mv "$file" "$ORGANIZED_DIR/perplexity/"
        moved=true
    # Twitter関連
    elif [[ $basename =~ test-twitter|test.*auth|twitter.*test|test.*post ]]; then
        mv "$file" "$ORGANIZED_DIR/twitter/"
        moved=true
    # 統合テスト関連
    elif [[ $basename =~ test.*end.*to.*end|test.*complete|test.*flow|integration ]]; then
        mv "$file" "$ORGANIZED_DIR/integration/"
        moved=true
    # その他はアーカイブ
    else
        mv "$file" "$ORGANIZED_DIR/archive/"
        moved=true
    fi
    
    if [ "$moved" = true ]; then
        echo "📁 $basename -> $(dirname $(realpath "$file" 2>/dev/null || echo "$file"))"
    fi
}

# 全テストファイルを分類
echo "📋 ファイル分類中..."
for file in "$TEST_DIR"/*.js; do
    if [ -f "$file" ]; then
        classify_and_move "$file"
    fi
done

# 非JavaScriptファイルも移動
for file in "$TEST_DIR"/*.{sh,http,txt,mjs}; do
    if [ -f "$file" ]; then
        mv "$file" "$ORGANIZED_DIR/archive/"
        echo "📄 $(basename "$file") -> archive/"
    fi
done

# 統計情報
echo ""
echo "📊 整理結果:"
echo "API テスト: $(find "$ORGANIZED_DIR/api" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "キャラクター テスト: $(find "$ORGANIZED_DIR/character" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "CoT テスト: $(find "$ORGANIZED_DIR/cot" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "DB テスト: $(find "$ORGANIZED_DIR/db" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "Perplexity テスト: $(find "$ORGANIZED_DIR/perplexity" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "Twitter テスト: $(find "$ORGANIZED_DIR/twitter" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "統合テスト: $(find "$ORGANIZED_DIR/integration" -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "アーカイブ: $(find "$ORGANIZED_DIR/archive" -name "*" -type f 2>/dev/null | wc -l | tr -d ' ')"

# 重複ファイル検出
echo ""
echo "🔍 重複ファイル検出..."
find "$ORGANIZED_DIR" -name "*.js" -exec basename {} \; | sort | uniq -d | while read duplicate; do
    echo "⚠️  重複: $duplicate"
    find "$ORGANIZED_DIR" -name "$duplicate"
done

# READMEファイル作成
cat > "$ORGANIZED_DIR/README.md" << 'EOF'
# テストスクリプト整理結果

## ディレクトリ構造

- `api/` - API関連のテスト
- `character/` - キャラクター生成テスト
- `cot/` - Chain of Thought関連テスト
- `db/` - データベーステスト
- `integration/` - E2Eテスト・統合テスト
- `perplexity/` - Perplexity API関連テスト
- `twitter/` - Twitter API・認証テスト
- `archive/` - その他のテストファイル

## よく使うテストコマンド

```bash
# 全テスト実行
./run-all-tests.sh

# カテゴリ別テスト実行
node cot/test-phase1-simple.js
node character/test-cardi-dare-final.js
node api/test-api-direct.js
```

## 重複ファイルの統合が必要

同じ機能をテストする複数ファイルが存在するため、統合を検討してください。
EOF

echo "✅ テストスクリプト整理完了!"
echo "📂 新しい構造: $ORGANIZED_DIR"
echo "📖 詳細: $ORGANIZED_DIR/README.md"