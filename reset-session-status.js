// セッションステータスをリセットするスクリプト
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function resetSessionStatus(sessionId) {
  try {
    // 現在のセッション状態を確認
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
    
    // EXECUTINGの場合、FAILEDに変更して再実行可能にする
    if (session.status === 'EXECUTING') {
      const updated = await prisma.cotSession.update({
        where: { id: sessionId },
        data: {
          status: 'FAILED',
          lastError: 'Manually reset from EXECUTING status'
        }
      });
      
      console.log('\n✅ Session status reset to FAILED');
      console.log('You can now retry the processing');
    } else {
      console.log('\nSession is not in EXECUTING status, no reset needed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// コマンドライン引数からセッションIDを取得
const sessionId = process.argv[2] || '56bfad58-7c2a-4d07-96bf-497565ae84e7';
console.log('Resetting session:', sessionId);
resetSessionStatus(sessionId);