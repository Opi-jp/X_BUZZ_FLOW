// INTEGRATEステップのセッションをリセット
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function resetIntegrateSession() {
  const sessionId = process.argv[2] || '2cf500f3-2ece-4961-a7f5-dc3ef011ae38';
  
  try {
    // セッションの現在の状態を確認
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }
    
    console.log('Current Status:', session.status);
    console.log('Current Phase:', session.currentPhase);
    console.log('Current Step:', session.currentStep);
    
    // INTEGRATINGまたはFAILEDの場合、EXECUTINGに戻す
    if (session.status === 'INTEGRATING' || session.status === 'FAILED') {
      const updated = await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'EXECUTING',
          currentStep: 'INTEGRATE',
          lastError: null
        }
      });
      
      console.log('\n✅ Session status reset');
      console.log('- Status:', updated.status);
      console.log('- Current Step:', updated.currentStep);
      console.log('\nReady to retry INTEGRATE step');
    } else {
      console.log('\nNo reset needed - session is in', session.status, 'status');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetIntegrateSession();