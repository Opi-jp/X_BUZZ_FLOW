#!/bin/bash

# Auto Install Script - 自動的にEnterを押してnpmインストールを進める
# Usage: ./scripts/auto-install.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/auto-proceed.py"

# Python scriptが存在するか確認
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "❌ Error: auto-proceed.py not found at $PYTHON_SCRIPT"
    exit 1
fi

echo "🚀 Starting auto-install with automatic proceed..."
echo "   This will automatically press Enter for any prompts"
echo ""

# npm installを実行して、auto-proceed.pyにパイプ
npm install 2>&1 | python "$PYTHON_SCRIPT"

# 終了ステータスをチェック
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ Installation completed successfully!"
else
    echo "❌ Installation failed with error code ${PIPESTATUS[0]}"
    exit ${PIPESTATUS[0]}
fi