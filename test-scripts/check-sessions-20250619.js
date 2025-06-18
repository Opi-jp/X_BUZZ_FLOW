const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkSessions() {
  try {
    const sessions = await prisma.viralSession.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        theme: true,
        status: true,
        createdAt: true
      }
    });

    console.log('最近のセッション:');
    sessions.forEach(session => {
      console.log(`- ID: ${session.id}`);
      console.log(`  テーマ: ${session.theme}`);
      console.log(`  ステータス: ${session.status}`);
      console.log(`  作成日時: ${session.createdAt}`);
      console.log('');
    });

    if (sessions.length > 0) {
      console.log(`\n詳細表示するには:`);
      console.log(`node scripts/dev-tools/flow-visualizer.js ${sessions[0].id}`);
    }
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();