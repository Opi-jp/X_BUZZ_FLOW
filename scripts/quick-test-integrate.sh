#!/bin/bash

# INTEGRATEステップの高速テストスクリプト
# サーバー再起動なしでテスト可能

SESSION_ID=${1:-"2cf500f3-2ece-4961-a7f5-dc3ef011ae38"}

echo "🔍 Phase 1 INTEGRATEの高速テスト"
echo "   セッションID: $SESSION_ID"
echo ""

# 1. 現在のステータスを確認
echo "📊 現在のステータス:"
node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
(async () => {
  const session = await prisma.cotSession.findUnique({
    where: { id: '$SESSION_ID' },
    include: { phases: { where: { phaseNumber: 1 } } }
  });
  if (!session) {
    console.log('❌ セッションが見つかりません');
    process.exit(1);
  }
  console.log('- Status:', session.status);
  console.log('- Step:', session.currentStep);
  console.log('- Phase 1 Execute完了:', !!session.phases[0]?.executeResult);
  await prisma.\$disconnect();
})();
"

# 2. ステータスをリセット
echo ""
echo "🔄 ステータスをリセット中..."
node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
(async () => {
  await prisma.cotSession.update({
    where: { id: '$SESSION_ID' },
    data: {
      status: 'EXECUTING',
      currentStep: 'INTEGRATE',
      lastError: null
    }
  });
  console.log('✅ リセット完了');
  await prisma.\$disconnect();
})();
"

# 3. INTEGRATEを実行
echo ""
echo "🚀 INTEGRATEステップを実行中..."
echo "   (エラーがある場合は下に表示されます)"
echo ""

curl -X POST http://localhost:3000/api/viral/cot-session/$SESSION_ID/process -s | jq '.' || echo "❌ APIエラー"

# 4. 結果を確認
echo ""
echo "📋 実行後のステータス:"
sleep 2
node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
(async () => {
  const session = await prisma.cotSession.findUnique({
    where: { id: '$SESSION_ID' }
  });
  console.log('- Status:', session.status);
  console.log('- Error:', session.lastError || 'なし');
  await prisma.\$disconnect();
})();
"