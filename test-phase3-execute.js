// Phase 3 EXECUTEを手動で実行するスクリプト
const { PrismaClient } = require('./app/generated/prisma');

const prisma = new PrismaClient();

async function testPhase3Execute() {
  const sessionId = '3abdb3e4-9031-4f5b-9419-845fb93a80ed';
  
  try {
    // セッションを取得
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    });
    
    console.log('Session:', {
      id: session.id,
      expertise: session.expertise,
      style: session.style,
      platform: session.platform,
      status: session.status,
      currentPhase: session.currentPhase,
      currentStep: session.currentStep
    });
    
    // Phase 3のデータを取得
    const phase3 = await prisma.cotPhase.findUnique({
      where: {
        sessionId_phaseNumber: {
          sessionId,
          phaseNumber: 3
        }
      }
    });
    
    if (!phase3) {
      console.error('Phase 3 not found');
      return;
    }
    
    console.log('\nPhase 3 data:');
    console.log('- Think result exists:', !!phase3.thinkResult);
    console.log('- Execute result exists:', !!phase3.executeResult);
    console.log('- Status:', phase3.status);
    
    if (phase3.thinkResult) {
      const thinkResult = phase3.thinkResult;
      console.log('\nThink result keys:', Object.keys(thinkResult));
      
      // Phase 3 EXECUTEはpassThroughなので、単にthinkResultを返すだけ
      const executeResult = thinkResult;
      
      console.log('\nExecute result (passThrough) keys:', Object.keys(executeResult));
      
      // DBに保存
      await prisma.cotPhase.update({
        where: {
          sessionId_phaseNumber: {
            sessionId,
            phaseNumber: 3
          }
        },
        data: {
          executeResult: executeResult,
          executeDuration: 100, // passThrough
          executeAt: new Date(),
          status: 'EXECUTING'
        }
      });
      
      // セッションを更新
      await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          currentStep: 'INTEGRATE',
          status: 'INTEGRATING'
        }
      });
      
      console.log('\n✅ Phase 3 EXECUTE completed successfully!');
      console.log('Next step: INTEGRATE');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPhase3Execute();