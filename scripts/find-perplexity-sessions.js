const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function findPerplexitySessions() {
  try {
    // Get all sessions with completed Phase 1
    const phases = await prisma.cotPhase.findMany({
      where: {
        phaseNumber: 1,
        status: 'COMPLETED',
        executeResult: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        session: true
      }
    });

    console.log(`Found ${phases.length} Phase 1 completed sessions\n`);

    let sessionsWithRealPerplexity = [];

    for (const phase of phases) {
      if (phase.executeResult) {
        try {
          const executeResult = typeof phase.executeResult === 'string' 
            ? JSON.parse(phase.executeResult) 
            : phase.executeResult;
          
          if (executeResult.savedPerplexityResponses && executeResult.savedPerplexityResponses.length > 0) {
            // Check if it's real data (not mock)
            const firstResponse = executeResult.savedPerplexityResponses[0];
            const isMock = firstResponse.response && firstResponse.response.includes('モック検索結果');
            const hasRealData = firstResponse.response && firstResponse.response.length > 500 && !isMock;
            
            if (hasRealData) {
              sessionsWithRealPerplexity.push({
                sessionId: phase.sessionId,
                expertise: phase.session.expertise,
                createdAt: phase.session.createdAt,
                queryCount: executeResult.savedPerplexityResponses.length,
                firstResponseLength: firstResponse.response.length,
                hasQueries: !!firstResponse.query
              });
            }
          }
        } catch (e) {
          // Skip parse errors
        }
      }
    }

    console.log(`Found ${sessionsWithRealPerplexity.length} sessions with real Perplexity data:\n`);
    
    sessionsWithRealPerplexity.forEach((session, index) => {
      console.log(`${index + 1}. Session: ${session.sessionId}`);
      console.log(`   Expertise: ${session.expertise}`);
      console.log(`   Created: ${session.createdAt}`);
      console.log(`   Queries: ${session.queryCount}`);
      console.log(`   Has query text: ${session.hasQueries}`);
      console.log(`   First response length: ${session.firstResponseLength} chars`);
      console.log('');
    });

    if (sessionsWithRealPerplexity.length > 0) {
      console.log('\n✅ Best session to use:');
      console.log(`Session ID: ${sessionsWithRealPerplexity[0].sessionId}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPerplexitySessions();