const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkSession() {
  const sessionId = 'cmc35goau00001syek9sxsj5v';
  
  const session = await prisma.viralSession.findUnique({
    where: { id: sessionId },
    include: {
      drafts: true
    }
  });
  
  if (!session) {
    console.log('Session not found');
    return;
  }
  
  console.log('Session:', {
    id: session.id,
    theme: session.theme,
    status: session.status,
    platform: session.platform,
    style: session.style,
    createdAt: session.createdAt,
    draftsCount: session.drafts.length
  });
  
  // topicsの内容を確認
  if (session.topics) {
    console.log('\n=== Topics (Perplexity) ===');
    console.log(session.topics.substring(0, 200) + '...');
  }
  
  // conceptsの内容を確認
  if (session.concepts) {
    console.log('\n=== Concepts (GPT) ===');
    try {
      const concepts = JSON.parse(session.concepts);
      console.log(`Total concepts: ${concepts.length}`);
      concepts.forEach((c, i) => {
        console.log(`\n${i+1}. ${c.conceptTitle}`);
        console.log(`   Hook: ${c.selectedHook}`);
        console.log(`   Angle: ${c.selectedAngle}`);
        console.log(`   Format: ${c.format}`);
      });
    } catch (e) {
      console.log('Failed to parse concepts:', e.message);
    }
  }
  
  // contentsの内容を確認
  if (session.contents) {
    console.log('\n=== Contents (Claude) ===');
    try {
      const contents = JSON.parse(session.contents);
      console.log(`Generated contents available`);
    } catch (e) {
      console.log('No contents generated yet');
    }
  }
  
  console.log('\n=== Next Steps ===');
  if (session.status === 'CONCEPTS_GENERATED') {
    console.log('Ready for Claude generation (character contents)');
    console.log(`Run: POST /api/generation/content/sessions/${sessionId}/generate`);
  }
}

checkSession()
  .catch(console.error)
  .finally(() => prisma.$disconnect());