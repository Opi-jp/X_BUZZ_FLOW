const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function findPhase1CompletedSessions() {
  try {
    // Get sessions where Phase 1 is completed but Phase 2 hasn't started
    const sessions = await prisma.cotSession.findMany({
      where: {
        currentPhase: 1,
        status: {
          in: ['COMPLETED', 'THINKING', 'EXECUTING', 'INTEGRATING']
        }
      },
      include: {
        phases: {
          orderBy: { phaseNumber: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${sessions.length} sessions at Phase 1\n`);

    for (const session of sessions) {
      const phase1 = session.phases.find(p => p.phaseNumber === 1);
      const phase2 = session.phases.find(p => p.phaseNumber === 2);
      
      if (phase1?.status === 'COMPLETED' && !phase2) {
        console.log(`✅ Perfect for testing - Phase 1 completed, Phase 2 not started:`);
        console.log(`   Session ID: ${session.id}`);
        console.log(`   Expertise: ${session.expertise}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log(`   Status: ${session.status}`);
        
        // Check if Phase 1 has real Perplexity data
        if (phase1.executeResult) {
          try {
            const executeResult = typeof phase1.executeResult === 'string'
              ? JSON.parse(phase1.executeResult)
              : phase1.executeResult;
            
            if (executeResult.savedPerplexityResponses?.length > 0) {
              const firstResponse = executeResult.savedPerplexityResponses[0];
              const hasRealData = firstResponse.response?.length > 500 && 
                                !firstResponse.response.includes('モック検索結果');
              console.log(`   Has real Perplexity data: ${hasRealData}`);
            }
          } catch (e) {}
        }
        console.log('');
      }
    }

    // Also check sessions stuck at Phase 2
    const phase2Sessions = await prisma.cotSession.findMany({
      where: {
        currentPhase: 2,
        status: {
          in: ['THINKING', 'EXECUTING']
        }
      },
      include: {
        phases: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (phase2Sessions.length > 0) {
      console.log(`\n=== Sessions stuck at Phase 2 ===`);
      phase2Sessions.forEach(session => {
        const phase2 = session.phases.find(p => p.phaseNumber === 2);
        console.log(`Session: ${session.id}`);
        console.log(`   Expertise: ${session.expertise}`);
        console.log(`   Phase 2 Status: ${phase2?.status || 'NOT STARTED'}`);
        console.log(`   Updated: ${phase2?.updatedAt || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPhase1CompletedSessions();