const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkErrorSessions() {
  try {
    // Get ERROR sessions
    const errorSessions = await prisma.viralSession.findMany({
      where: {
        status: 'ERROR'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('❌ ERROR Sessions:');
    console.log('==================');
    console.log(`Total: ${errorSessions.length} sessions\n`);

    errorSessions.forEach((session, index) => {
      console.log(`${index + 1}. Session ID: ${session.id}`);
      console.log(`   Theme: ${session.theme}`);
      console.log(`   Created: ${new Date(session.createdAt).toLocaleString()}`);
      console.log(`   Has Topics: ${session.topics ? 'Yes' : 'No'}`);
      console.log(`   Has Concepts: ${session.concepts ? 'Yes' : 'No'}`);
      console.log(`   Has Contents: ${session.contents ? 'Yes' : 'No'}`);
      
      // Try to determine where it failed
      let failedAt = 'UNKNOWN';
      if (session.contents) failedAt = 'AFTER_CONTENTS';
      else if (session.concepts) failedAt = 'AFTER_CONCEPTS';
      else if (session.topics) failedAt = 'AFTER_TOPICS';
      else failedAt = 'DURING_TOPICS';
      
      console.log(`   Failed at: ${failedAt}`);
      console.log('');
    });

    // Summary
    const failurePoints = errorSessions.reduce((acc, session) => {
      let failedAt = 'UNKNOWN';
      if (session.contents) failedAt = 'AFTER_CONTENTS';
      else if (session.concepts) failedAt = 'AFTER_CONCEPTS';
      else if (session.topics) failedAt = 'AFTER_TOPICS';
      else failedAt = 'DURING_TOPICS';
      
      acc[failedAt] = (acc[failedAt] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Failure Points Summary:');
    console.log('==========================');
    Object.entries(failurePoints).forEach(([point, count]) => {
      console.log(`${point}: ${count} sessions`);
    });

  } catch (error) {
    console.error('Error checking sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkErrorSessions();