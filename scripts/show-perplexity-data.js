const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function showPerplexityData(sessionId) {
  try {
    const phase = await prisma.cotPhase.findFirst({
      where: {
        sessionId: sessionId,
        phaseNumber: 1
      },
      include: {
        session: true
      }
    });

    if (!phase) {
      console.log('Phase not found');
      return;
    }

    console.log('Session Information:');
    console.log('===================');
    console.log(`Session ID: ${phase.session.id}`);
    console.log(`Expertise: ${phase.session.expertise}`);
    console.log(`Status: ${phase.session.status}`);
    console.log(`Created: ${phase.session.createdAt}`);
    console.log('\n');

    // Show think result
    if (phase.thinkResult) {
      console.log('THINK Result (Search Queries Generated):');
      console.log('========================================');
      const thinkResult = typeof phase.thinkResult === 'string' 
        ? JSON.parse(phase.thinkResult) 
        : phase.thinkResult;
      
      if (thinkResult.searchQueries) {
        thinkResult.searchQueries.forEach((q, i) => {
          console.log(`\nQuery ${i + 1}:`);
          console.log(`Category: ${q.category}`);
          console.log(`Intent: ${q.intent}`);
          console.log(`Angle: ${q.angle}`);
          console.log(`Query: ${q.query}`);
        });
      }
    }

    // Show execute result (Perplexity responses)
    if (phase.executeResult) {
      console.log('\n\nEXECUTE Result (Perplexity Responses):');
      console.log('======================================');
      const executeResult = typeof phase.executeResult === 'string' 
        ? JSON.parse(phase.executeResult) 
        : phase.executeResult;
      
      if (executeResult.savedPerplexityResponses) {
        executeResult.savedPerplexityResponses.forEach((resp, i) => {
          console.log(`\n\nPerplexity Response ${i + 1}:`);
          console.log('------------------------');
          console.log(`Query: ${resp.query || 'Not saved'}`);
          console.log(`\nResponse (first 1000 chars):`);
          console.log(resp.response?.substring(0, 1000));
          console.log('\n[... truncated ...]');
        });
      }
    }

    // Show integrate result
    if (phase.integrateResult) {
      console.log('\n\nINTEGRATE Result (Trending Topics):');
      console.log('===================================');
      const integrateResult = typeof phase.integrateResult === 'string' 
        ? JSON.parse(phase.integrateResult) 
        : phase.integrateResult;
      
      if (integrateResult.trendedTopics) {
        integrateResult.trendedTopics.forEach((topic, i) => {
          console.log(`\nTopic ${i + 1}: ${topic.title || 'No title'}`);
          console.log(`Description: ${topic.description || 'No description'}`);
          console.log(`Viral Potential: ${topic.viralPotential || 'Not rated'}`);
          console.log(`News Source: ${topic.newsSource || 'Unknown'}`);
          console.log(`URL: ${topic.sourceUrl || 'No URL'}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Use the session with real Perplexity data
showPerplexityData('d00361fc-4ccc-41c1-90a3-6f0daf40d39d');