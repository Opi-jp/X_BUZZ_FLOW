const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkIncompleteSessions() {
  try {
    // Count sessions by status
    const statusCounts = await prisma.viralSession.groupBy({
      by: ['status'],
      _count: true,
      orderBy: {
        _count: {
          status: 'desc'
        }
      }
    });

    console.log('📊 Session Status Distribution:');
    console.log('================================');
    statusCounts.forEach(({ status, _count }) => {
      console.log(`${status}: ${_count} sessions`);
    });

    // Get incomplete sessions (not COMPLETED)
    const incompleteSessions = await prisma.viralSession.findMany({
      where: {
        status: {
          not: 'COMPLETED'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      include: {
        drafts: true,
        characterProfile: true
      }
    });

    console.log('\n🔄 Incomplete Sessions (Latest 20):');
    console.log('=====================================');
    
    incompleteSessions.forEach((session, index) => {
      const age = Math.floor((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60));
      
      console.log(`\n${index + 1}. Session ID: ${session.id}`);
      console.log(`   Theme: ${session.theme}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Created: ${new Date(session.createdAt).toLocaleString()} (${age} hours ago)`);
      console.log(`   Has Topics: ${session.topics ? 'Yes' : 'No'}`);
      console.log(`   Has Concepts: ${session.concepts ? 'Yes' : 'No'}`);
      console.log(`   Selected IDs: ${session.selectedIds.length > 0 ? session.selectedIds.join(', ') : 'None'}`);
      console.log(`   Has Contents: ${session.contents ? 'Yes' : 'No'}`);
      console.log(`   Drafts: ${session.drafts.length}`);
    });

    // Analyze stuck patterns
    const stuckSessions = await prisma.viralSession.findMany({
      where: {
        AND: [
          {
            status: {
              not: 'COMPLETED'
            }
          },
          {
            createdAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
            }
          }
        ]
      },
      select: {
        status: true,
        theme: true
      }
    });

    const stuckPatterns = stuckSessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n⚠️  Sessions Stuck for >24 hours:');
    console.log('===================================');
    Object.entries(stuckPatterns).forEach(([status, count]) => {
      console.log(`${status}: ${count} sessions`);
    });

    // Check recent test sessions
    const recentTestSessions = await prisma.viralSession.findMany({
      where: {
        AND: [
          {
            OR: [
              { theme: { contains: 'テスト' } },
              { theme: { contains: 'test' } },
              { theme: { contains: 'Test' } }
            ]
          },
          {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n🧪 Recent Test Sessions (Last 7 days):');
    console.log('======================================');
    recentTestSessions.forEach((session) => {
      console.log(`ID: ${session.id}`);
      console.log(`   Theme: ${session.theme}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Created: ${new Date(session.createdAt).toLocaleString()}`);
      console.log('');
    });

    // Analyze data completeness for stuck sessions
    const dataCompleteness = incompleteSessions.map(session => {
      const hasTopics = !!session.topics;
      const hasConcepts = !!session.concepts;
      const hasSelectedIds = session.selectedIds.length > 0;
      const hasContents = !!session.contents;
      
      let stuckAt = 'INITIAL';
      if (hasContents) stuckAt = 'CONTENTS';
      else if (hasSelectedIds || hasConcepts) stuckAt = 'CONCEPTS';
      else if (hasTopics) stuckAt = 'TOPICS';
      
      return { status: session.status, stuckAt };
    });

    const stuckAtPatterns = dataCompleteness.reduce((acc, item) => {
      const key = `${item.status} - ${item.stuckAt}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📍 Where Sessions Get Stuck:');
    console.log('=====================================');
    Object.entries(stuckAtPatterns).forEach(([pattern, count]) => {
      console.log(`${pattern}: ${count} sessions`);
    });

  } catch (error) {
    console.error('Error checking sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIncompleteSessions();