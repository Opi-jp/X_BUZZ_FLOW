// Phase 1のデータがあるセッションをリスト
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function listSessions() {
  try {
    const sessions = await prisma.cotSession.findMany({
      include: {
        phases: {
          where: {
            phaseNumber: 1
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`Found ${sessions.length} sessions:\n`);
    
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. Session: ${session.id}`);
      console.log(`   - Expertise: ${session.expertise}`);
      console.log(`   - Status: ${session.status}`);
      console.log(`   - Current Phase: ${session.currentPhase}`);
      console.log(`   - Created: ${session.createdAt}`);
      
      if (session.phases.length > 0) {
        const phase1 = session.phases[0];
        console.log(`   - Phase 1 Status: ${phase1.status}`);
        console.log(`   - Has integrate result: ${!!phase1.integrateResult}`);
        
        if (phase1.integrateResult) {
          const integrate = typeof phase1.integrateResult === 'string' 
            ? JSON.parse(phase1.integrateResult) 
            : phase1.integrateResult;
          console.log(`   - Trended Topics: ${integrate.trendedTopics?.length || 0}`);
        }
      }
      console.log();
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listSessions();