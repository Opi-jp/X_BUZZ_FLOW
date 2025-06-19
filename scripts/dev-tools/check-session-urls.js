const { PrismaClient } = require('../../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkLatestSession() {
  try {
    const sessions = await prisma.viralSession.findMany({
      where: {
        topics: { not: null },
        status: { in: ['TOPICS_COLLECTED', 'CONCEPTS_GENERATED', 'CONTENTS_GENERATED', 'COMPLETED'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    if (sessions.length > 0) {
      const session = sessions[0];
      console.log('Latest session with topics:', session.id);
      console.log('Theme:', session.theme);
      console.log('Status:', session.status);
      
      const topics = session.topics;
      if (topics && topics.parsed) {
        console.log('\nFound', topics.parsed.length, 'topics:');
        topics.parsed.forEach((topic, idx) => {
          console.log(`\nTopic ${idx + 1}: ${topic.TOPIC}`);
          console.log('URL:', topic.url);
          console.log('Date:', topic.date);
          if (topic.additionalSources && topic.additionalSources.length > 0) {
            console.log('Additional sources:', topic.additionalSources.length);
            topic.additionalSources.forEach(src => {
              console.log(`  - ${src.title}: ${src.url}`);
            });
          }
        });
      }
    } else {
      console.log('No sessions with topics found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestSession();