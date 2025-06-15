// Phase 4 EXECUTEを素早く実行
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function quickExecute() {
  const sessionId = '3abdb3e4-9031-4f5b-9419-845fb93a80ed';
  
  try {
    // Phase 4のThink結果を取得
    const phase4 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 4
        }
      }
    });
    
    // Phase 4 EXECUTEはpassThroughなので、Think結果をそのまま返す
    await prisma.cotPhase.update({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 4
        }
      },
      data: {
        executeResult: phase4.thinkResult,
        executeDuration: 100,
        executeAt: new Date(),
        status: 'EXECUTING'
      }
    });
    
    // セッションのステップを更新
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        currentStep: 'INTEGRATE',
        status: 'PENDING' // 次のINTEGRATEが実行できるようにPENDINGに戻す
      }
    });
    
    console.log('✅ Phase 4 EXECUTE completed!');
    console.log('Status reset to PENDING for INTEGRATE step');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickExecute();