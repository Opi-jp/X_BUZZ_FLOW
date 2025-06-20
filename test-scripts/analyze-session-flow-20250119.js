const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function analyzeSessionFlow() {
  try {
    // Get all sessions
    const allSessions = await prisma.viralSession.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('📊 Session Flow Analysis:');
    console.log('========================\n');
    console.log(`Total Sessions: ${allSessions.length}`);

    // Count by progress
    const progressCounts = {
      created: 0,
      hasTopics: 0,
      hasConcepts: 0,
      hasSelectedIds: 0,
      hasContents: 0,
      completed: 0
    };

    // Count by status
    const statusCounts = {};

    allSessions.forEach(session => {
      // Count progress
      progressCounts.created++;
      if (session.topics) progressCounts.hasTopics++;
      if (session.concepts) progressCounts.hasConcepts++;
      if (session.selectedIds && session.selectedIds.length > 0) progressCounts.hasSelectedIds++;
      if (session.contents) progressCounts.hasContents++;
      if (session.status === 'COMPLETED') progressCounts.completed++;

      // Count status
      statusCounts[session.status] = (statusCounts[session.status] || 0) + 1;
    });

    console.log('\n🚀 Progress Funnel:');
    console.log('==================');
    console.log(`1. Created: ${progressCounts.created} (100%)`);
    console.log(`2. Has Topics: ${progressCounts.hasTopics} (${Math.round(progressCounts.hasTopics/progressCounts.created*100)}%)`);
    console.log(`3. Has Concepts: ${progressCounts.hasConcepts} (${Math.round(progressCounts.hasConcepts/progressCounts.created*100)}%)`);
    console.log(`4. Has Selected IDs: ${progressCounts.hasSelectedIds} (${Math.round(progressCounts.hasSelectedIds/progressCounts.created*100)}%)`);
    console.log(`5. Has Contents: ${progressCounts.hasContents} (${Math.round(progressCounts.hasContents/progressCounts.created*100)}%)`);
    console.log(`6. Completed: ${progressCounts.completed} (${Math.round(progressCounts.completed/progressCounts.created*100)}%)`);

    console.log('\n📈 Status Distribution:');
    console.log('======================');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`${status}: ${count} (${Math.round(count/allSessions.length*100)}%)`);
      });

    // Recent success rate (last 24 hours)
    const recentSessions = allSessions.filter(s => 
      new Date(s.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentSessions.length > 0) {
      const recentCompleted = recentSessions.filter(s => s.status === 'COMPLETED').length;
      const recentErrors = recentSessions.filter(s => s.status === 'ERROR').length;
      
      console.log('\n⏰ Last 24 Hours:');
      console.log('=================');
      console.log(`Total: ${recentSessions.length} sessions`);
      console.log(`Completed: ${recentCompleted} (${Math.round(recentCompleted/recentSessions.length*100)}%)`);
      console.log(`Errors: ${recentErrors} (${Math.round(recentErrors/recentSessions.length*100)}%)`);
    }

    // Find bottlenecks
    console.log('\n🚧 Bottlenecks:');
    console.log('===============');
    console.log(`Topics Collection: ${progressCounts.created - progressCounts.hasTopics} sessions failed`);
    console.log(`Concept Generation: ${progressCounts.hasTopics - progressCounts.hasConcepts} sessions stuck`);
    console.log(`Content Generation: ${progressCounts.hasConcepts - progressCounts.hasContents} sessions stuck`);

  } catch (error) {
    console.error('Error analyzing sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSessionFlow();