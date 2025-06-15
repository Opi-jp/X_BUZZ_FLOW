#!/bin/bash

# Claudeセッション保存スクリプト
# 現在の開発環境の状態を保存して次回に引き継ぐ

echo "💾 Claudeセッション状態を保存中..."
echo ""

# ディレクトリ作成
mkdir -p .claude-session

# 現在時刻
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 1. サーバー状態の収集
echo "1️⃣ サーバー状態を確認中..."

NEXT_PID=$(lsof -ti:3000 2>/dev/null || echo "")
PRISMA_PID=$(lsof -ti:5555 2>/dev/null || echo "")

NEXT_STATUS="stopped"
PRISMA_STATUS="stopped"

if [ ! -z "$NEXT_PID" ]; then
  NEXT_STATUS="running"
fi

if [ ! -z "$PRISMA_PID" ]; then
  PRISMA_STATUS="running"
fi

# 2. 最新のCoTセッションIDを取得
echo "2️⃣ 作業中のセッションを確認中..."

LATEST_SESSION_ID=$(node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
prisma.cotSession.findFirst({
  orderBy: { createdAt: 'desc' },
  select: { id: true, status: true, currentPhase: true, expertise: true }
})
.then(session => {
  if (session) {
    console.log(JSON.stringify(session));
  } else {
    console.log('null');
  }
  return prisma.\$disconnect();
})
.catch(() => {
  console.log('null');
});
" 2>/dev/null)

# 3. 現在の作業状態を記録
echo "3️⃣ 作業状態を記録中..."

# JSONファイルに保存
cat > .claude-session/session-state.json << EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": {
    "nextjs": {
      "status": "$NEXT_STATUS",
      "pid": "$NEXT_PID",
      "port": 3000
    },
    "prisma": {
      "status": "$PRISMA_STATUS", 
      "pid": "$PRISMA_PID",
      "port": 5555
    }
  },
  "currentWork": {
    "latestSession": $LATEST_SESSION_ID
  },
  "quickCommands": {
    "startAll": "./scripts/dev-start.sh",
    "status": "./scripts/dev-status.sh",
    "cleanup": "./scripts/cleanup-ports.sh",
    "testPhase1": "node scripts/test-db-phase1.js"
  }
}
EOF

# 4. 作業メモの作成/更新を促す
if [ ! -f .claude-session/current-work.md ]; then
  cat > .claude-session/current-work.md << EOF
# 現在の作業状態

## 最終更新: $TIMESTAMP

### 実装中の機能
- [ ] 

### 解決すべき問題
- [ ] 

### 次のステップ
1. 

### メモ
- 

---
*このファイルを更新して、次回のセッションに引き継ぎたい情報を記載してください*
EOF
fi

# 5. 現在のエラーログを保存（もしあれば）
if [ -f npm-debug.log ]; then
  cp npm-debug.log .claude-session/last-error.log
fi

# 6. 保存完了
echo ""
echo "✅ セッション状態を保存しました！"
echo ""
echo "📁 保存先: .claude-session/"
echo "   - session-state.json: 環境状態"
echo "   - current-work.md: 作業メモ（編集してください）"
echo ""

# 現在の状態サマリー
echo "📊 現在の状態:"
echo "   Next.js: $NEXT_STATUS"
echo "   Prisma: $PRISMA_STATUS"

if [ "$LATEST_SESSION_ID" != "null" ]; then
  echo "   作業中のセッション: $(echo $LATEST_SESSION_ID | jq -r .id | cut -c1-8)..."
fi

echo ""
echo "💡 次回のセッション開始時:"
echo "   ./scripts/session-restore.sh"
echo ""
echo "📝 作業メモを更新することをお勧めします:"
echo "   code .claude-session/current-work.md"