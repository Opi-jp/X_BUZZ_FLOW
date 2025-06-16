// テストセッションのPhase 2結果を確認
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function checkTestSession() {
  const sessionId = 'b721776b-ce78-4921-8b82-831c70541e61';
  
  try {
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
    
    console.log('📊 Test Session Status:');
    console.log('- ID:', session.id);
    console.log('- Status:', session.status);
    console.log('- Current Phase:', session.currentPhase);
    console.log('- Current Step:', session.currentStep);
    console.log('- Total Phases:', session.phases.length);
    
    // Phase 2の詳細を確認
    const phase2 = session.phases.find(p => p.phaseNumber === 2);
    if (phase2) {
      console.log('\n📌 Phase 2 Details:');
      console.log('- Status:', phase2.status);
      console.log('- Created:', phase2.createdAt);
      
      // プロンプトを確認
      if (phase2.thinkPrompt) {
        console.log('\n🔍 Phase 2 THINK Prompt (checking interpolation):');
        
        // trendedTopicsが正しく展開されているか確認
        const hasObjectObject = phase2.thinkPrompt.includes('[object Object]');
        const hasActualTopic = phase2.thinkPrompt.includes('AIによるリモートワーク');
        
        console.log('- Contains [object Object]:', hasObjectObject);
        console.log('- Contains actual topic data:', hasActualTopic);
        
        // プロンプトの一部を表示
        const topicsSection = phase2.thinkPrompt.match(/# Phase 1で特定されたトレンドトピック\n([\s\S]{0,500})/);
        if (topicsSection) {
          console.log('\n📄 Trended Topics section:');
          console.log(topicsSection[1]);
        }
      }
      
      // THINK結果を確認
      if (phase2.thinkResult) {
        const think = typeof phase2.thinkResult === 'string' 
          ? JSON.parse(phase2.thinkResult) 
          : phase2.thinkResult;
          
        console.log('\n✅ Phase 2 THINK Result:');
        console.log('- evaluatedOpportunities:', think.evaluatedOpportunities?.length || 0);
        
        if (think.evaluatedOpportunities?.length > 0) {
          const firstOpp = think.evaluatedOpportunities[0];
          console.log('\nFirst evaluated opportunity:');
          console.log('- Topic:', firstOpp.topicName);
          console.log('- Score:', firstOpp.overallScore);
          console.log('- Content Angles:', firstOpp.contentAngles?.length || 0);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestSession();