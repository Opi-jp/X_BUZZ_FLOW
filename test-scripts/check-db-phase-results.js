// データベースに保存されているフェーズ結果を確認
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function checkPhaseResults(sessionId) {
  try {
    // セッションとフェーズデータを取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    });
    
    if (!session) {
      console.error('Session not found');
      return;
    }
    
    console.log('📊 Session Overview:');
    console.log('- ID:', session.id);
    console.log('- Status:', session.status);
    console.log('- Current Phase:', session.currentPhase);
    console.log('- Current Step:', session.currentStep);
    console.log('- Total Phases Saved:', session.phases.length);
    
    // 各フェーズの詳細を確認
    session.phases.forEach(phase => {
      console.log(`\n📌 Phase ${phase.phaseNumber}:`);
      console.log('- Status:', phase.status);
      console.log('- Created:', phase.createdAt);
      console.log('- Updated:', phase.updatedAt);
      
      // 各ステップの結果を確認
      if (phase.thinkResult) {
        console.log('- THINK: ✅ Saved');
        const think = typeof phase.thinkResult === 'string' ? JSON.parse(phase.thinkResult) : phase.thinkResult;
        console.log('  - Queries:', think.queries?.length || 0);
      } else {
        console.log('- THINK: ❌ Not saved');
      }
      
      if (phase.executeResult) {
        console.log('- EXECUTE: ✅ Saved');
        const execute = typeof phase.executeResult === 'string' ? JSON.parse(phase.executeResult) : phase.executeResult;
        console.log('  - Search Results:', execute.searchResults?.length || 0);
      } else {
        console.log('- EXECUTE: ❌ Not saved');
      }
      
      if (phase.integrateResult) {
        console.log('- INTEGRATE: ✅ Saved');
        const integrate = typeof phase.integrateResult === 'string' ? JSON.parse(phase.integrateResult) : phase.integrateResult;
        console.log('  - Opportunities:', integrate.opportunities?.length || 0);
        if (integrate.opportunities?.length > 0) {
          console.log('  - First opportunity:', integrate.opportunities[0].topic);
        }
      } else {
        console.log('- INTEGRATE: ❌ Not saved');
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// コマンドライン引数からセッションIDを取得
const sessionId = process.argv[2] || '56bfad58-7c2a-4d07-96bf-497565ae84e7';
console.log('Checking session:', sessionId);
console.log('---\n');
checkPhaseResults(sessionId);