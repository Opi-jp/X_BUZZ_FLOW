const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkCompleteSession() {
  try {
    // Get the most recent completed session
    const session = await prisma.viralSession.findFirst({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      include: {
        drafts: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      console.log('No completed sessions found');
      return;
    }

    console.log('=== Most Recent Completed Session ===');
    console.log(`ID: ${session.id}`);
    console.log(`Theme: ${session.theme}`);
    console.log(`Platform: ${session.platform}`);
    console.log(`Style: ${session.style}`);
    console.log(`Status: ${session.status}`);
    console.log(`Selected IDs: ${session.selectedIds.join(', ')}`);
    console.log(`Created: ${session.createdAt.toISOString()}`);

    // Show topics
    if (session.topics) {
      console.log('\n=== Topics (Perplexity) ===');
      const topics = JSON.parse(JSON.stringify(session.topics));
      if (topics.topics) {
        topics.topics.forEach((topic, i) => {
          console.log(`\nTopic ${i + 1}: ${topic.title}`);
          console.log(`Description: ${topic.description.substring(0, 100)}...`);
        });
      }
    }

    // Show concepts
    if (session.concepts) {
      console.log('\n=== Concepts (GPT) ===');
      const concepts = JSON.parse(JSON.stringify(session.concepts));
      if (concepts.concepts) {
        concepts.concepts.forEach((concept, i) => {
          console.log(`\nConcept ${i + 1}: ${concept.id}`);
          console.log(`Title: ${concept.title}`);
          console.log(`Hook: ${concept.hook}`);
          console.log(`Description: ${concept.description.substring(0, 100)}...`);
        });
      }
    }

    // Show contents
    if (session.contents) {
      console.log('\n=== Contents (Claude) ===');
      const contents = JSON.parse(JSON.stringify(session.contents));
      if (contents.contents) {
        contents.contents.forEach((content, i) => {
          console.log(`\nContent ${i + 1}: ${content.conceptId}`);
          console.log(`Title: ${content.title}`);
          console.log(`Main Text: ${content.mainText.substring(0, 100)}...`);
        });
      }
    }

    // Show drafts
    if (session.drafts && session.drafts.length > 0) {
      console.log('\n=== Generated Drafts ===');
      session.drafts.forEach((draft, i) => {
        console.log(`\nDraft ${i + 1}: ${draft.id}`);
        console.log(`Status: ${draft.status}`);
        console.log(`Title: ${draft.title}`);
        console.log(`Hashtags: ${draft.hashtags.join(', ')}`);
        console.log(`Posted: ${draft.postedAt ? 'Yes' : 'No'}`);
        if (draft.tweetId) {
          console.log(`Tweet ID: ${draft.tweetId}`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompleteSession();