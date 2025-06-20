const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkSessionRaw() {
  try {
    // Get the most recent completed session with raw data
    const session = await prisma.viralSession.findFirst({
      where: { id: 'cmc3h28l000041yvqswou3421' }
    });

    if (!session) {
      console.log('Session not found');
      return;
    }

    console.log('=== Session Raw Data ===');
    console.log('ID:', session.id);
    console.log('Status:', session.status);
    console.log('\n--- Topics ---');
    console.log(JSON.stringify(session.topics, null, 2));
    console.log('\n--- Concepts ---');
    console.log(JSON.stringify(session.concepts, null, 2));
    console.log('\n--- Contents ---');
    console.log(JSON.stringify(session.contents, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionRaw();