#!/bin/bash

# Claudeセッション復元スクリプト
# 前回の状態を復元して作業を継続

echo "🔄 Claudeセッション状態を復元中..."
echo ""

# 1. 最重要ドキュメントの確認
echo "📋 最重要ドキュメントの確認:"
if [ -f "docs/chain-of-thought-specification.md" ]; then
  echo "✅ chain-of-thought-specification.md: 存在"
  echo "   最終更新: $(stat -f "%Sm" docs/chain-of-thought-specification.md 2>/dev/null || date -r docs/chain-of-thought-specification.md)"
else
  echo "❌ chain-of-thought-specification.md: 見つかりません！"
  echo "   これは最重要ドキュメントです！"
fi

# CLAUDE.mdも確認
if [ -f "CLAUDE.md" ]; then
  echo "✅ CLAUDE.md: 存在"
else
  echo "⚠️  CLAUDE.md: 見つかりません"
fi

echo ""

# 2. 前回のセッション状態を読み込み
if [ -f ".claude-session/session-state.json" ]; then
  echo "📊 前回のセッション状態:"
  
  LAST_TIME=$(jq -r .timestamp .claude-session/session-state.json 2>/dev/null || echo "不明")
  NEXT_STATUS=$(jq -r .environment.nextjs.status .claude-session/session-state.json 2>/dev/null || echo "不明")
  PRISMA_STATUS=$(jq -r .environment.prisma.status .claude-session/session-state.json 2>/dev/null || echo "不明")
  
  echo "   最終保存: $LAST_TIME"
  echo "   Next.js: $NEXT_STATUS"
  echo "   Prisma: $PRISMA_STATUS"
  
  # 最新のセッション情報
  LATEST_SESSION=$(jq -r .currentWork.latestSession .claude-session/session-state.json 2>/dev/null)
  if [ "$LATEST_SESSION" != "null" ] && [ ! -z "$LATEST_SESSION" ]; then
    SESSION_ID=$(echo $LATEST_SESSION | jq -r .id)
    SESSION_STATUS=$(echo $LATEST_SESSION | jq -r .status)
    SESSION_PHASE=$(echo $LATEST_SESSION | jq -r .currentPhase)
    echo ""
    echo "   作業中のCoTセッション:"
    echo "   - ID: $(echo $SESSION_ID | cut -c1-8)..."
    echo "   - ステータス: $SESSION_STATUS"
    echo "   - フェーズ: $SESSION_PHASE"
  fi
else
  echo "⚠️  前回のセッション状態が見つかりません"
fi

echo ""

# 3. 最新の作業ログを確認
echo "📝 最新の作業ログ:"

# 自動ログの最新ファイルを探す
LATEST_LOG=$(ls -t ~/work_logs/X_BUZZ_FLOW/auto_logs/*.md 2>/dev/null | head -1)
if [ ! -z "$LATEST_LOG" ]; then
  echo "   最新ログ: $(basename $LATEST_LOG)"
  echo "   最終更新: $(stat -f "%Sm" "$LATEST_LOG" 2>/dev/null || date -r "$LATEST_LOG")"
  
  # 最後の5行を表示
  echo ""
  echo "   最後のエントリ:"
  tail -5 "$LATEST_LOG" | sed 's/^/   /'
else
  echo "   作業ログが見つかりません"
fi

echo ""

# 4. 現在の環境状態
echo "🔍 現在の環境状態:"
./scripts/dev-status.sh | grep -E "✅|❌|⚠️" | sed 's/^/   /'

echo ""

# 5. 作業メモの表示
if [ -f ".claude-session/current-work.md" ]; then
  echo "📄 作業メモ:"
  # 空行を除いて最初の20行を表示
  grep -v "^$" .claude-session/current-work.md | head -20 | sed 's/^/   /'
  echo ""
fi

# 6. 推奨アクション
echo "💡 推奨アクション:"
echo ""

# サーバーが停止している場合
CURRENT_NEXT=$(lsof -ti:3000 2>/dev/null)
if [ -z "$CURRENT_NEXT" ]; then
  echo "1. 開発環境を起動:"
  echo "   ./scripts/dev-start.sh"
  echo ""
fi

# 作業ログが古い場合
if [ ! -z "$LATEST_LOG" ]; then
  LOG_AGE=$(( ($(date +%s) - $(stat -f "%m" "$LATEST_LOG" 2>/dev/null || stat -c "%Y" "$LATEST_LOG" 2>/dev/null)) / 3600 ))
  if [ $LOG_AGE -gt 24 ]; then
    echo "2. 新しい作業ログセッションを開始:"
    echo "   ./scripts/auto_log_updater.sh start"
    echo ""
  fi
fi

echo "3. 最重要ドキュメントを確認:"
echo "   cat docs/chain-of-thought-specification.md"
echo ""

echo "4. 実装原則を確認:"
echo "   cat docs/cot-implementation-principles.md"
echo ""

if [ "$LATEST_SESSION" != "null" ] && [ ! -z "$SESSION_ID" ]; then
  echo "5. 前回のCoTセッションを確認:"
  echo "   SESSION_ID=$SESSION_ID"
  echo ""
fi

echo "========================================="
echo "🚀 クイックスタート:"
echo ""
echo "# すべて自動起動:"
echo "./scripts/dev-start.sh"
echo ""
echo "# 作業ログ開始:"
echo "./scripts/auto_log_updater.sh start"
echo ""
echo "# 最重要ドキュメント確認:"
echo "cat docs/chain-of-thought-specification.md"
echo "========================================="