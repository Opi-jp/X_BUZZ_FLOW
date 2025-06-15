// Phase 2のコンテキストを確認
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function checkPhase2Context(sessionId) {
  try {
    // Phase 1の結果を取得
    const phase1 = await prisma.cotPhase.findFirst({
      where: {
        sessionId: sessionId,
        phaseNumber: 1
      }
    });
    
    // Phase 2の結果を取得
    const phase2 = await prisma.cotPhase.findFirst({
      where: {
        sessionId: sessionId,
        phaseNumber: 2
      }
    });
    
    console.log('📌 Phase 1 → Phase 2 Data Flow:');
    
    if (phase1?.integrateResult) {
      const integrate = typeof phase1.integrateResult === 'string' 
        ? JSON.parse(phase1.integrateResult) 
        : phase1.integrateResult;
        
      console.log('\nPhase 1 INTEGRATE has:');
      console.log('- trendedTopics:', integrate.trendedTopics?.length || 0, 'topics');
      console.log('- topicCount:', integrate.topicCount);
      
      if (integrate.trendedTopics?.length > 0) {
        console.log('\nFirst topic:', integrate.trendedTopics[0].topicName);
      }
    }
    
    if (phase2) {
      console.log('\n📌 Phase 2 Status:', phase2.status);
      
      if (phase2.thinkResult) {
        const think = typeof phase2.thinkResult === 'string' 
          ? JSON.parse(phase2.thinkResult) 
          : phase2.thinkResult;
          
        console.log('\nPhase 2 THINK result:');
        console.log('- Type:', typeof think);
        console.log('- Keys:', Object.keys(think));
        console.log('- Full result:', JSON.stringify(think, null, 2));
      }
      
      // Phase 2のプロンプトを確認
      if (phase2.thinkPrompt) {
        console.log('\n🔍 Phase 2 THINK prompt (first 500 chars):');
        console.log(phase2.thinkPrompt.substring(0, 500) + '...');
        
        // trendedTopicsがプロンプトに含まれているか確認
        const hasTrendedTopics = phase2.thinkPrompt.includes('Phase 1で特定されたトレンドトピック');
        console.log('\n- Contains "trendedTopics" placeholder:', hasTrendedTopics);
        
        // 実際のデータが挿入されているか確認
        const hasActualData = phase2.thinkPrompt.includes('AIによるリモートワーク') || 
                             phase2.thinkPrompt.includes('topicName');
        console.log('- Contains actual topic data:', hasActualData);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const sessionId = process.argv[2] || '56bfad58-7c2a-4d07-96bf-497565ae84e7';
checkPhase2Context(sessionId);