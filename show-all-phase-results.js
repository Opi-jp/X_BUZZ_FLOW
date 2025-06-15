// 全フェーズの処理結果を詳細表示
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function showAllPhaseResults() {
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
    
    console.log('='.repeat(80));
    console.log('📊 SESSION OVERVIEW');
    console.log('='.repeat(80));
    console.log('Session ID:', session.id);
    console.log('Expertise:', session.expertise);
    console.log('Platform:', session.platform);
    console.log('Style:', session.style);
    console.log('Status:', session.status);
    console.log('Current Phase:', session.currentPhase);
    console.log('Current Step:', session.currentStep);
    console.log('\n');
    
    // 各フェーズの詳細を表示
    for (const phase of session.phases) {
      console.log('='.repeat(80));
      console.log(`📌 PHASE ${phase.phaseNumber}`);
      console.log('='.repeat(80));
      console.log('Status:', phase.status);
      console.log('Created:', phase.createdAt);
      console.log('Updated:', phase.updatedAt);
      
      // THINK結果
      if (phase.thinkResult) {
        console.log('\n--- THINK RESULT ---');
        const think = typeof phase.thinkResult === 'string' 
          ? JSON.parse(phase.thinkResult) 
          : phase.thinkResult;
        
        if (phase.phaseNumber === 1) {
          console.log('Search Queries Generated:', think.queries?.length || 0);
          if (think.queries?.length > 0) {
            think.queries.forEach((q, i) => {
              console.log(`\n${i + 1}. ${q.topic}`);
              console.log(`   Category: ${q.category}`);
              console.log(`   Intent: ${q.intent}`);
              console.log(`   Viral Potential:`, JSON.stringify(q.viralPotential));
            });
          }
        } else if (phase.phaseNumber === 2) {
          console.log('Evaluated Opportunities:', think.evaluatedOpportunities?.length || 0);
          if (think.evaluatedOpportunities?.length > 0) {
            think.evaluatedOpportunities.forEach((opp, i) => {
              console.log(`\n${i + 1}. ${opp.topicName}`);
              console.log(`   Overall Score: ${opp.overallScore}`);
              console.log(`   Viral Velocity Score: ${opp.viralVelocityScore}`);
              console.log(`   Velocity Metrics:`, JSON.stringify(opp.velocityMetrics));
              console.log(`   Content Angles: ${opp.contentAngles?.length || 0}`);
              if (opp.contentAngles?.length > 0) {
                opp.contentAngles.forEach((angle, j) => {
                  console.log(`     ${j + 1}. ${angle.angle}: ${angle.description}`);
                });
              }
            });
          }
        }
      }
      
      // EXECUTE結果
      if (phase.executeResult) {
        console.log('\n--- EXECUTE RESULT ---');
        const execute = typeof phase.executeResult === 'string' 
          ? JSON.parse(phase.executeResult) 
          : phase.executeResult;
        
        if (phase.phaseNumber === 1) {
          console.log('Search Results:', execute.searchResults?.length || 0);
          console.log('Search Method:', execute.searchMethod);
          console.log('Total Results:', execute.totalResults);
          
          if (execute.searchResults?.length > 0) {
            console.log('\nSearch Topics:');
            execute.searchResults.forEach((r, i) => {
              console.log(`${i + 1}. ${r.topic}`);
              console.log(`   Analysis Length: ${r.analysis?.length || 0} chars`);
              console.log(`   Has Sources: ${r.sources?.length > 0 ? 'Yes' : 'No'}`);
            });
          }
        } else if (phase.phaseNumber === 2) {
          console.log('Execute Result:', JSON.stringify(execute, null, 2));
        }
      }
      
      // INTEGRATE結果
      if (phase.integrateResult) {
        console.log('\n--- INTEGRATE RESULT ---');
        const integrate = typeof phase.integrateResult === 'string' 
          ? JSON.parse(phase.integrateResult) 
          : phase.integrateResult;
        
        if (phase.phaseNumber === 1) {
          console.log('Topic Count:', integrate.topicCount);
          console.log('Trended Topics:', integrate.trendedTopics?.length || 0);
          
          if (integrate.trendedTopics?.length > 0) {
            console.log('\nTrended Topics:');
            integrate.trendedTopics.forEach((topic, i) => {
              console.log(`\n${i + 1}. ${topic.topicName}`);
              console.log(`   Category: ${topic.category}`);
              console.log(`   Summary: ${topic.summary}`);
              console.log(`   Current Status: ${topic.currentStatus}`);
              console.log(`   Viral Elements:`, JSON.stringify(topic.viralElements));
              console.log(`   Expertise Relevance: ${topic.expertiseRelevance}`);
              console.log(`   Sources: ${topic.sources?.length || 0}`);
            });
          }
          
          console.log('\nCategory Insights:', JSON.stringify(integrate.categoryInsights, null, 2));
        } else if (phase.phaseNumber === 2) {
          console.log('Selected Opportunities:', integrate.selectedOpportunities?.length || 0);
          console.log('Full Result:', JSON.stringify(integrate, null, 2));
        }
      }
      
      console.log('\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showAllPhaseResults();