// 既存のDBデータを使ってPhase 2をテスト
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function testPhase2WithExistingData() {
  try {
    // 特定のセッションIDを使用（Phase 1が完了している）
    const sessionId = '56bfad58-7c2a-4d07-96bf-497565ae84e7';
    const completedSession = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          where: {
            phaseNumber: 1
          }
        }
      }
    });
    
    if (!completedSession || completedSession.phases.length === 0) {
      console.error('No completed Phase 1 sessions found');
      return;
    }
    
    console.log('📊 Using session:', completedSession.id);
    console.log('- Expertise:', completedSession.expertise);
    console.log('- Platform:', completedSession.platform);
    console.log('- Style:', completedSession.style);
    
    const phase1 = completedSession.phases[0];
    const integrateResult = typeof phase1.integrateResult === 'string' 
      ? JSON.parse(phase1.integrateResult) 
      : phase1.integrateResult;
    
    console.log('\n✅ Phase 1 data available:');
    console.log('- Trended Topics:', integrateResult.trendedTopics?.length || 0);
    
    // 新しいセッションを作成してPhase 1のデータをコピー
    console.log('\n🚀 Creating new test session with Phase 1 data...');
    
    const newSession = await prisma.cotSession.create({
      data: {
        expertise: completedSession.expertise,
        style: completedSession.style,
        platform: completedSession.platform,
        status: 'COMPLETED',
        currentPhase: 2,
        currentStep: 'THINK'
      }
    });
    
    // Phase 1のデータをコピー
    await prisma.cotPhase.create({
      data: {
        sessionId: newSession.id,
        phaseNumber: 1,
        status: 'COMPLETED',
        thinkResult: phase1.thinkResult,
        executeResult: phase1.executeResult,
        integrateResult: phase1.integrateResult,
        thinkAt: new Date(),
        executeAt: new Date(),
        integrateAt: new Date()
      }
    });
    
    console.log('\n✅ New test session created:', newSession.id);
    console.log('Ready to test Phase 2 with existing data');
    
    // Phase 2を実行
    console.log('\n🔄 Executing Phase 2...');
    const response = await fetch(`http://localhost:3001/api/viral/cot-session/${newSession.id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    console.log('\nPhase 2 execution result:');
    console.log('- Success:', result.success);
    console.log('- Phase:', result.phase);
    console.log('- Step:', result.step);
    console.log('- Duration:', result.duration, 'ms');
    
    if (result.success && result.result) {
      console.log('\n📝 Phase 2 output:');
      console.log('- Evaluated Opportunities:', result.result.evaluatedOpportunities?.length || 0);
      if (result.result.evaluatedOpportunities?.length > 0) {
        const firstOpp = result.result.evaluatedOpportunities[0];
        console.log('\nFirst opportunity:');
        console.log('- Topic:', firstOpp.topicName);
        console.log('- Score:', firstOpp.overallScore || firstOpp.viralVelocityScore);
        console.log('- Best Angle:', firstOpp.contentAngles?.[0]?.angle);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPhase2WithExistingData();