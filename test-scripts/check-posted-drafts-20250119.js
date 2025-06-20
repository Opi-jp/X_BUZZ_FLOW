const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkPostedDrafts() {
  try {
    const postedDrafts = await prisma.viralDraftV2.findMany({
      where: { status: 'POSTED' },
      orderBy: { postedAt: 'desc' },
      take: 5
    });

    console.log('=== Posted Drafts ===');
    if (postedDrafts.length === 0) {
      console.log('No posted drafts found');
    } else {
      postedDrafts.forEach((draft, i) => {
        console.log(`\nPosted Draft ${i + 1}:`);
        console.log(`ID: ${draft.id}`);
        console.log(`Title: ${draft.title}`);
        console.log(`Posted At: ${draft.postedAt.toISOString()}`);
        console.log(`Tweet ID: ${draft.tweetId || 'No Tweet ID'}`);
        console.log(`Content: ${draft.content.substring(0, 100)}...`);
      });
    }

    // Check recently scheduled drafts
    const scheduledDrafts = await prisma.viralDraftV2.findMany({
      where: { 
        status: 'SCHEDULED',
        scheduledAt: { not: null }
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5
    });

    console.log('\n\n=== Scheduled Drafts ===');
    if (scheduledDrafts.length === 0) {
      console.log('No scheduled drafts found');
    } else {
      scheduledDrafts.forEach((draft, i) => {
        console.log(`\nScheduled Draft ${i + 1}:`);
        console.log(`ID: ${draft.id}`);
        console.log(`Title: ${draft.title}`);
        console.log(`Scheduled For: ${draft.scheduledAt.toISOString()}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostedDrafts();