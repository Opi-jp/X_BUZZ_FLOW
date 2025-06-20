#!/bin/bash

# 統合デバッガー付き永続開発環境
# 各種デバッガーをtmuxウィンドウとして組み込み

# カラー出力定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Claude-dev Development Environment${NC}"
echo -e "${PURPLE}   X_BUZZ_FLOW AI開発統合システム${NC}"
echo -e "${CYAN}=================================================${NC}"

# tmuxがインストールされているか確認
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}❌ tmuxがインストールされていません${NC}"
    echo -e "   ${YELLOW}brew install tmux${NC} でインストールしてください"
    exit 1
fi

# プロジェクトディレクトリの確認
PROJECT_DIR="/Users/yukio/X_BUZZ_FLOW"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ プロジェクトディレクトリが見つかりません: $PROJECT_DIR${NC}"
    exit 1
fi

SESSION_NAME="claude-dev"

# 既存のセッションをチェック
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo -e "${BLUE}📍 既存のClaude-dev環境に接続します${NC}"
    tmux attach-session -t $SESSION_NAME
else
    echo -e "${GREEN}🚀 Claude専用デバッグ環境を作成します${NC}"
    
    # 新しいセッションを作成（Next.jsサーバー）
    echo -e "${BLUE}📱 Next.js Server (Port 3000)${NC}"
    tmux new-session -d -s $SESSION_NAME -n next
    tmux send-keys -t $SESSION_NAME:next "cd $PROJECT_DIR && npm run dev" Enter
    
    # Claude専用ログビューアー
    echo -e "${PURPLE}🤖 Claude Log Viewer${NC}"
    tmux new-window -t $SESSION_NAME -n claude-logs
    tmux send-keys -t $SESSION_NAME:claude-logs "cd $PROJECT_DIR && sleep 3 && node scripts/dev-tools/claude-log-viewer.js" Enter
    
    # 統合フロントエンドデバッガー
    echo -e "${CYAN}🔍 Frontend Debugger${NC}"
    tmux new-window -t $SESSION_NAME -n frontend-debug
    tmux send-keys -t $SESSION_NAME:frontend-debug "cd $PROJECT_DIR && sleep 5 && node scripts/dev-tools/unified-frontend-debugger.js" Enter
    
    # API依存関係スキャナー（監視モード）
    echo -e "${YELLOW}🔗 API Dependencies Monitor${NC}"
    tmux new-window -t $SESSION_NAME -n api-monitor
    tmux send-keys -t $SESSION_NAME:api-monitor "cd $PROJECT_DIR && while true; do clear; node scripts/dev-tools/api-dependency-scanner.js; echo ''; echo 'Next update in 30s...'; sleep 30; done" Enter
    
    # DB監視・スキーマバリデーター
    echo -e "${GREEN}🗄️  Database Monitor${NC}"
    tmux new-window -t $SESSION_NAME -n db-monitor
    tmux send-keys -t $SESSION_NAME:db-monitor "cd $PROJECT_DIR && node scripts/dev-tools/db-monitor.js" Enter
    
    # Prisma Studio
    echo -e "${BLUE}💾 Prisma Studio${NC}"
    tmux new-window -t $SESSION_NAME -n prisma
    tmux send-keys -t $SESSION_NAME:prisma "cd $PROJECT_DIR && npx prisma studio" Enter
    
    # フロー可視化ツール
    echo -e "${PURPLE}📈 Flow Visualizer${NC}"
    tmux new-window -t $SESSION_NAME -n flow-viz
    tmux send-keys -t $SESSION_NAME:flow-viz "cd $PROJECT_DIR && while true; do clear; node scripts/dev-tools/flow-visualizer.js; echo ''; echo 'Next update in 10s...'; sleep 10; done" Enter
    
    # E2Eテスト監視
    echo -e "${CYAN}🧪 E2E Test Monitor${NC}"
    tmux new-window -t $SESSION_NAME -n e2e-test
    tmux send-keys -t $SESSION_NAME:e2e-test "cd $PROJECT_DIR && echo 'E2E Test Ready. Run: node scripts/dev-tools/e2e-flow-tester.js'; bash" Enter
    
    # エラーコレクター（バックグラウンド）
    echo -e "${RED}🚨 Error Collector${NC}"
    tmux new-window -t $SESSION_NAME -n error-watch
    tmux send-keys -t $SESSION_NAME:error-watch "cd $PROJECT_DIR && node scripts/dev-tools/smart-error-collector.js" Enter
    
    # Claude専用インタラクティブコンソール
    echo -e "${YELLOW}⌨️  Claude Interactive Console${NC}"
    tmux new-window -t $SESSION_NAME -n claude-console
    tmux send-keys -t $SESSION_NAME:claude-console "cd $PROJECT_DIR && clear" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '🤖 Claude-dev Interactive Console'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '============================='" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo 'Quick Commands:'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '  📊 Status: node scripts/dev-tools/flow-visualizer.js'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '  🔍 API: node scripts/dev-tools/api-dependency-scanner.js'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '  🗄️  DB: node scripts/dev-tools/db-schema-validator.js'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '  🧪 Test: node scripts/dev-tools/e2e-flow-tester.js'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '  📝 Prompt: node scripts/dev-tools/prompt-editor.js list'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo '  🚨 Instant Error: node scripts/dev-tools/claude-instant-error-detector.js'" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "echo ''" Enter
    tmux send-keys -t $SESSION_NAME:claude-console "PS1='\[\033[1;32m\]claude-dev\[\033[0m\]:\[\033[1;34m\]\w\[\033[0m\]\$ '" Enter
    
    # ビルド監視（ウィンドウ10）
    echo -e "${RED}🔨 Build Monitor${NC}"
    tmux new-window -t $SESSION_NAME -n build-watch
    tmux send-keys -t $SESSION_NAME:build-watch "cd $PROJECT_DIR && sleep 10 && node scripts/dev-tools/build-monitor.js" Enter
    
    # TypeScript型チェック（ウィンドウ11）
    echo -e "${PURPLE}📐 TypeScript Type Check${NC}"
    tmux new-window -t $SESSION_NAME -n type-check
    tmux send-keys -t $SESSION_NAME:type-check "cd $PROJECT_DIR && npm run type:watch" Enter
    
    # 自動エラーキャプチャ（ウィンドウ12）
    echo -e "${YELLOW}🎯 Auto Error Capture${NC}"
    tmux new-window -t $SESSION_NAME -n error-capture
    tmux send-keys -t $SESSION_NAME:error-capture "cd $PROJECT_DIR && sleep 15 && node scripts/dev-tools/auto-error-capture.js" Enter
    
    # 最初のウィンドウ（next）に戻る
    tmux select-window -t $SESSION_NAME:next
    
    sleep 2
    
    echo -e "${GREEN}✅ Claude-dev環境が起動しました${NC}"
    echo ""
    echo -e "${CYAN}📍 Claude専用コマンド:${NC}"
    echo -e "   接続: ${YELLOW}tmux attach -t $SESSION_NAME${NC}"
    echo -e "   切り離し: ${YELLOW}Ctrl+B → D${NC}"
    echo -e "   ウィンドウ切り替え: ${YELLOW}Ctrl+B → 数字${NC}"
    echo -e "   ウィンドウ一覧: ${YELLOW}Ctrl+B → W${NC}"
    echo -e "   終了: ${YELLOW}tmux kill-session -t $SESSION_NAME${NC}"
    echo ""
    echo -e "${CYAN}🪟 Claude-dev ウィンドウ構成:${NC}"
    echo -e "   ${GREEN}0: next${NC}          - Next.js Development Server"
    echo -e "   ${PURPLE}1: claude-logs${NC}   - Claude専用ログビューアー"
    echo -e "   ${CYAN}2: frontend-debug${NC} - フロントエンドデバッガー"
    echo -e "   ${YELLOW}3: api-monitor${NC}   - API依存関係監視"
    echo -e "   ${GREEN}4: db-monitor${NC}    - データベース監視"
    echo -e "   ${BLUE}5: prisma${NC}        - Prisma Studio"
    echo -e "   ${PURPLE}6: flow-viz${NC}      - フロー可視化"
    echo -e "   ${CYAN}7: e2e-test${NC}      - E2Eテスト"
    echo -e "   ${RED}8: error-watch${NC}   - エラー監視"
    echo -e "   ${YELLOW}9: console${NC}       - インタラクティブコンソール"
    echo -e "   ${RED}10: build-watch${NC}  - ビルド監視"
    echo -e "   ${PURPLE}11: type-check${NC}   - TypeScript型チェック"
    echo ""
    echo -e "${GREEN}🎉 統合開発環境に接続します...${NC}"
    echo ""
    
    tmux attach-session -t $SESSION_NAME
fi