const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkSessionDetail(sessionId) {
  try {
    const session = await prisma.cotSession.findUnique({
      where: { id: sessionId },
      include: {
        phases: {
          where: { phaseNumber: 1 },
          orderBy: { phaseNumber: 'asc' }
        }
      }
    });

    if (!session) {
      console.log('Session not found');
      return;
    }

    console.log('Session Details:');
    console.log('================');
    console.log(`ID: ${session.id}`);
    console.log(`Expertise: ${session.expertise}`);
    console.log(`Status: ${session.status}`);
    console.log(`Current Phase: ${session.currentPhase}`);
    console.log(`Created: ${session.createdAt}`);
    console.log('\n');

    const phase1 = session.phases[0];
    if (phase1) {
      console.log('Phase 1 Details:');
      console.log('================');
      console.log(`Status: ${phase1.status}`);
      
      // Check executeResult
      if (phase1.executeResult) {
        console.log('\nExecute Result:');
        const executeResult = typeof phase1.executeResult === 'string' 
          ? JSON.parse(phase1.executeResult) 
          : phase1.executeResult;
        
        if (executeResult.savedPerplexityResponses) {
          console.log(`\nPerplexity Responses (${executeResult.savedPerplexityResponses.length} queries):`);
          console.log('='.repeat(50));
          
          executeResult.savedPerplexityResponses.forEach((response, index) => {
            console.log(`\nQuery ${index + 1}:`);
            console.log(`Question: ${response.query || 'N/A'}`);
            console.log(`Response length: ${response.response?.length || 0} characters`);
            console.log(`First 500 chars: ${response.response?.substring(0, 500)}...`);
            console.log('-'.repeat(50));
          });
        }
      }
      
      // Check integrateResult
      if (phase1.integrateResult) {
        console.log('\nIntegrate Result:');
        const integrateResult = typeof phase1.integrateResult === 'string' 
          ? JSON.parse(phase1.integrateResult) 
          : phase1.integrateResult;
        
        if (integrateResult.trendedTopics) {
          console.log(`\nTrended Topics (${integrateResult.trendedTopics.length}):`);
          integrateResult.trendedTopics.forEach((topic, index) => {
            console.log(`\n${index + 1}. ${topic.title}`);
            console.log(`   Description: ${topic.description}`);
            console.log(`   Viral Potential: ${topic.viralPotential}`);
            console.log(`   News Source: ${topic.newsSource}`);
            console.log(`   Source URL: ${topic.sourceUrl}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get the most recent session with Perplexity data
const sessionId = process.argv[2] || 'd00361fc-4ccc-41c1-90a3-6f0daf40d39d';
checkSessionDetail(sessionId);