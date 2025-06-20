const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkRecentSessions() {
  try {
    // Get recent sessions
    const sessions = await prisma.viralSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        theme: true,
        platform: true,
        style: true,
        topics: true,
        concepts: true,
        contents: true,
        selectedIds: true,
        createdAt: true
      }
    });

    console.log('=== Recent Viral Sessions ===');
    sessions.forEach(session => {
      console.log(`\nID: ${session.id}`);
      console.log(`Status: ${session.status}`);
      console.log(`Theme: ${session.theme}`);
      console.log(`Platform: ${session.platform}`);
      console.log(`Style: ${session.style}`);
      console.log(`Topics: ${session.topics ? 'Yes' : 'No'}`);
      console.log(`Concepts: ${session.concepts ? 'Yes' : 'No'}`);
      console.log(`Contents: ${session.contents ? 'Yes' : 'No'}`);
      console.log(`Selected IDs: ${session.selectedIds.length > 0 ? session.selectedIds.join(', ') : 'None'}`);
      console.log(`Created: ${session.createdAt.toISOString()}`);
    });

    // Get recent drafts
    const drafts = await prisma.viralDraftV2.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        title: true,
        content: true,
        hashtags: true,
        scheduledAt: true,
        postedAt: true,
        tweetId: true,
        createdAt: true
      }
    });

    console.log('\n\n=== Recent Viral Drafts ===');
    drafts.forEach(draft => {
      console.log(`\nID: ${draft.id}`);
      console.log(`Status: ${draft.status}`);
      console.log(`Title: ${draft.title}`);
      console.log(`Content: ${draft.content ? draft.content.substring(0, 50) + '...' : 'No content'}`);
      console.log(`Hashtags: ${draft.hashtags.join(', ')}`);
      console.log(`Scheduled: ${draft.scheduledAt ? draft.scheduledAt.toISOString() : 'Not scheduled'}`);
      console.log(`Posted: ${draft.postedAt ? draft.postedAt.toISOString() : 'Not posted'}`);
      console.log(`Tweet ID: ${draft.tweetId || 'None'}`);
      console.log(`Created: ${draft.createdAt.toISOString()}`);
    });

    // Check for completed flows
    const completedSessions = await prisma.viralSession.count({
      where: { status: 'CONTENTS_GENERATED' }
    });
    
    const postedDrafts = await prisma.viralDraftV2.count({
      where: { status: 'POSTED' }
    });

    console.log('\n\n=== Summary ===');
    console.log(`Total completed sessions: ${completedSessions}`);
    console.log(`Total posted drafts: ${postedDrafts}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentSessions();