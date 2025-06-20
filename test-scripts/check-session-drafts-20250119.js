const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkSessionDrafts() {
  try {
    const drafts = await prisma.viralDraftV2.findMany({
      where: { sessionId: 'cmc3ys8lt00041yaic50q6h99' },
      orderBy: { createdAt: 'desc' }
    });

    console.log('=== Drafts created for session ===');
    drafts.forEach((draft, i) => {
      console.log(`\nDraft ${i + 1}:`);
      console.log(`ID: ${draft.id}`);
      console.log(`Title: ${draft.title}`);
      console.log(`Status: ${draft.status}`);
      console.log(`Content: ${draft.content.substring(0, 100)}...`);
      console.log(`Hashtags: ${draft.hashtags.join(', ')}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionDrafts();