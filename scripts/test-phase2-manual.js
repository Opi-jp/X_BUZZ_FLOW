const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function testPhase2(sessionId) {
  try {
    // Get session details
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    });

    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    console.log('\n=== Session Details ===');
    console.log(`ID: ${session.id}`);
    console.log(`Expertise: ${session.expertise}`);
    console.log(`Status: ${session.status}`);
    console.log(`Current Phase: ${session.currentPhase}`);
    
    console.log('\n=== Phase Status ===');
    session.phases.forEach(phase => {
      console.log(`Phase ${phase.phaseNumber}: ${phase.status}`);
    });

    // Check Phase 1 results
    const phase1 = session.phases.find(p => p.phaseNumber === 1);
    if (!phase1 || phase1.status !== 'COMPLETED') {
      console.error('\nPhase 1 is not completed');
      return;
    }

    console.log('\n=== Phase 1 Results ===');
    if (phase1.integrateResult) {
      const integrateResult = typeof phase1.integrateResult === 'string' 
        ? JSON.parse(phase1.integrateResult)
        : phase1.integrateResult;
      
      console.log(`Trending Topics Found: ${integrateResult.trendedTopics?.length || 0}`);
      integrateResult.trendedTopics?.forEach((topic, i) => {
        console.log(`\n${i + 1}. ${topic.topicName}`);
        console.log(`   Score: ${topic.trendScore}`);
        console.log(`   Description: ${topic.description}`);
      });
    }

    // Check if Phase 2 exists or needs to be triggered
    const phase2 = session.phases.find(p => p.phaseNumber === 2);
    if (!phase2) {
      console.log('\n⚠️  Phase 2 not created yet');
      console.log('\n🚀 To trigger Phase 2, use:');
      console.log(`curl -X POST http://localhost:3000/api/viral/cot-session/${sessionId}/process`);
    } else {
      console.log(`\n=== Phase 2 Status: ${phase2.status} ===`);
      
      if (phase2.thinkResult) {
        console.log('\n📝 Phase 2 Think Result:');
        const thinkResult = typeof phase2.thinkResult === 'string'
          ? JSON.parse(phase2.thinkResult)
          : phase2.thinkResult;
        console.log(JSON.stringify(thinkResult, null, 2));
      }

      if (phase2.integrateResult) {
        console.log('\n✅ Phase 2 Integrate Result:');
        const integrateResult = typeof phase2.integrateResult === 'string'
          ? JSON.parse(phase2.integrateResult)
          : phase2.integrateResult;
        
        console.log(`Selected Opportunities: ${integrateResult.selectedOpportunities?.length || 0}`);
        integrateResult.selectedOpportunities?.forEach((opp, i) => {
          console.log(`\n${i + 1}. ${opp.opportunity}`);
          console.log(`   Relevance: ${opp.relevanceToExpertise}`);
          console.log(`   Viral Score: ${opp.viralPotentialScore}`);
          console.log(`   Content Angle: ${opp.contentAngle}`);
        });
      }
    }

    // Manual test URL
    console.log('\n=== Manual Test Commands ===');
    console.log('\n1. Process next phase:');
    console.log(`curl -X POST http://localhost:3000/api/viral/cot-session/${sessionId}/process`);
    
    console.log('\n2. Continue async (if using async-api):');
    console.log(`curl -X POST http://localhost:3000/api/viral/cot-session/${sessionId}/continue-async`);

    console.log('\n3. Check task status:');
    console.log(`node check-task-status.js ${sessionId}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get sessionId from command line
const sessionId = process.argv[2];
if (!sessionId) {
  console.error('Usage: node test-phase2-manual.js <sessionId>');
  process.exit(1);
}

testPhase2(sessionId);