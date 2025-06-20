const { prisma } = require('./lib/prisma');

(async () => {
  try {
    const sessions = await prisma.viral_sessions.findMany({
      select: { id: true, status: true, topics: true, concepts: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('=== 最新のセッション ===');
    sessions.forEach(s => {
      console.log('ID:', s.id);
      console.log('ステータス:', s.status);
      console.log('トピックあり:', !!s.topics);
      console.log('コンセプトあり:', !!s.concepts);
      console.log('---');
    });
    
    // TOPICS_COLLECTEDのセッションを探す
    const readySession = sessions.find(s => s.status === 'TOPICS_COLLECTED' && s.topics);
    if (readySession) {
      console.log('🎯 コンセプト生成可能なセッション:', readySession.id);
    } else {
      console.log('⚠️ コンセプト生成可能なセッションが見つかりません');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('DB Error:', error);
    process.exit(1);
  }
})();