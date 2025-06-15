// テストセッションをPhase 2実行可能な状態にリセット
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function resetTestSession() {
  const sessionId = 'b721776b-ce78-4921-8b82-831c70541e61';
  
  try {
    // セッションのステータスをPENDINGに戻す
    const updated = await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'PENDING',
        currentPhase: 2,
        currentStep: 'THINK'
      }
    });
    
    console.log('✅ Session reset:');
    console.log('- Status:', updated.status);
    console.log('- Current Phase:', updated.currentPhase);
    console.log('- Current Step:', updated.currentStep);
    console.log('\nReady to process Phase 2');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetTestSession();