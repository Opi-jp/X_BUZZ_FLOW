#!/bin/bash

# プロンプトエディター非インタラクティブ実行例
# 2025-06-19

echo "=== プロンプトエディター非インタラクティブ実行例 ==="
echo ""
echo "Claudeが直接実行できるコマンド例："
echo ""

# 例1: Perplexity実行
echo "1️⃣ Perplexity - トピック収集"
echo "────────────────────────────────────────"
echo 'node scripts/dev-tools/prompt-editor.js test-direct perplexity/collect-topics.txt \'
echo '  theme="AIと働き方" \'
echo '  platform=Twitter \'
echo '  style=エンターテイメント \'
echo '  --non-interactive'
echo ""

# 例2: GPT実行
echo "2️⃣ GPT - コンセプト生成"
echo "────────────────────────────────────────"
echo 'node scripts/dev-tools/prompt-editor.js test-direct gpt/generate-concepts.txt \'
echo '  platform=Twitter \'
echo '  style=エンターテイメント \'
echo '  topicTitle="AIが仕事を奪うという恐怖" \'
echo '  topicSummary="AIが雇用市場に与える影響" \'
echo '  --non-interactive'
echo ""

# 例3: Claude実行
echo "3️⃣ Claude - コンテンツ生成"
echo "────────────────────────────────────────"
echo 'node scripts/dev-tools/prompt-editor.js test-direct claude/character-profiles/cardi-dare-simple.txt \'
echo '  character="カーディ・ダーレ、53歳の男性。元詐欺師。" \'
echo '  concept="AIが仕事を奪うという話題について" \'
echo '  --non-interactive'
echo ""

echo "💡 ポイント："
echo "- --non-interactive フラグで自動実行"
echo "- 結果は自動保存される"
echo "- モックデータも自動保存される"
echo "- キー=値の形式でパラメータを渡す"
echo "- 値にスペースが含まれる場合は引用符で囲む"
echo ""
echo "📁 結果は以下に保存されます："
echo "- prompt-test-results/ （API実行結果）"
echo "- lib/prompts/mock-data/ （モックデータ）"