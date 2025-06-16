const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function findRecentSessions() {
  try {
    // Get most recent sessions
    const sessions = await prisma.cotSession.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      }
    });

    console.log(`=== Recent ${sessions.length} Sessions ===\n`);

    for (const session of sessions) {
      console.log(`Session: ${session.id}`);
      console.log(`   Expertise: ${session.expertise}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Current Phase: ${session.currentPhase}`);
      console.log(`   Created: ${new Date(session.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(session.updatedAt).toLocaleString()}`);
      
      // Show phase details
      console.log('   Phases:');
      session.phases.forEach(phase => {
        console.log(`     Phase ${phase.phaseNumber}: ${phase.status}`);
        
        // Check for Perplexity data in Phase 1
        if (phase.phaseNumber === 1 && phase.executeResult) {
          try {
            const executeResult = typeof phase.executeResult === 'string'
              ? JSON.parse(phase.executeResult)
              : phase.executeResult;
            
            if (executeResult.savedPerplexityResponses?.length > 0) {
              const firstResponse = executeResult.savedPerplexityResponses[0];
              const hasRealData = firstResponse.response?.length > 500 && 
                                !firstResponse.response.includes('モック検索結果');
              console.log(`       - Has real Perplexity data: ${hasRealData}`);
              console.log(`       - Response count: ${executeResult.savedPerplexityResponses.length}`);
            }
          } catch (e) {}
        }
        
        // Check integrate results
        if (phase.integrateResult) {
          try {
            const integrateResult = typeof phase.integrateResult === 'string'
              ? JSON.parse(phase.integrateResult)
              : phase.integrateResult;
            
            if (phase.phaseNumber === 1) {
              console.log(`       - Topics found: ${integrateResult.trendedTopics?.length || 0}`);
            } else if (phase.phaseNumber === 2) {
              console.log(`       - Selected opportunities: ${integrateResult.selectedOpportunities?.length || 0}`);
            } else if (phase.phaseNumber === 3) {
              console.log(`       - Concepts generated: ${integrateResult.concepts?.length || 0}`);
            }
          } catch (e) {}
        }
      });
      
      console.log('');
    }

    // Find best candidate for Phase 2 testing
    console.log('\n=== Best Candidates for Phase 2 Testing ===');
    for (const session of sessions) {
      const phase1 = session.phases.find(p => p.phaseNumber === 1);
      const phase2 = session.phases.find(p => p.phaseNumber === 2);
      
      if (phase1?.status === 'COMPLETED' && phase1.integrateResult) {
        try {
          const integrateResult = typeof phase1.integrateResult === 'string'
            ? JSON.parse(phase1.integrateResult)
            : phase1.integrateResult;
          
          if (integrateResult.trendedTopics?.length > 0) {
            console.log(`\n✅ Session: ${session.id}`);
            console.log(`   Expertise: ${session.expertise}`);
            console.log(`   Phase 1: COMPLETED with ${integrateResult.trendedTopics.length} topics`);
            console.log(`   Phase 2: ${phase2?.status || 'NOT STARTED'}`);
            
            if (!phase2 || phase2.status === 'THINKING') {
              console.log(`   👉 Good for testing Phase 2!`);
            }
          }
        } catch (e) {}
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findRecentSessions();