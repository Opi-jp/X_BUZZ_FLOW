const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkRecentSessions() {
  try {
    // Get recent CoT sessions
    const sessions = await prisma.cotSession.findMany({
      where: {
        OR: [
          { status: 'COMPLETED' },
          { currentPhase: { gte: 1 } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      include: {
        phases: {
          where: {
            phaseNumber: 1
          }
        }
      }
    });

    console.log(`Found ${sessions.length} recent sessions:\n`);

    for (const session of sessions) {
      console.log(`Session ID: ${session.id}`);
      console.log(`Status: ${session.status}`);
      console.log(`Current Phase: ${session.currentPhase}`);
      console.log(`Expertise: ${session.expertise}`);
      console.log(`Created: ${session.createdAt}`);
      
      // Check Phase 1 data
      const phase1 = session.phases[0];
      if (phase1) {
        console.log(`Phase 1 Status: ${phase1.status}`);
        
        // Check for executeResult with perplexityResponses
        if (phase1.executeResult) {
          try {
            const executeResult = typeof phase1.executeResult === 'string' 
              ? JSON.parse(phase1.executeResult) 
              : phase1.executeResult;
            
            if (executeResult.savedPerplexityResponses) {
              console.log(`✅ Has Perplexity responses: ${executeResult.savedPerplexityResponses.length} queries`);
              
              // Show first response summary
              if (executeResult.savedPerplexityResponses.length > 0) {
                const firstResponse = executeResult.savedPerplexityResponses[0];
                console.log(`  First query: ${firstResponse.query?.substring(0, 100)}...`);
              }
            } else {
              console.log(`❌ No Perplexity responses found`);
            }
          } catch (e) {
            console.log(`❌ Error parsing executeResult: ${e.message}`);
          }
        } else {
          console.log(`❌ No executeResult found`);
        }
      } else {
        console.log(`❌ No Phase 1 data found`);
      }
      
      console.log('-'.repeat(80));
    }
  } catch (error) {
    console.error('Error checking sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentSessions();