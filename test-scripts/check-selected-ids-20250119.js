import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkSelectedIds() {
  try {
    // 特定のセッションを取得
    const sessionId = 'cmc3h28l000041yvqswou3421';
    
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        selectedIds: true,
        concepts: true,
        status: true
      }
    });

    if (!session) {
      console.log(`Session ${sessionId} not found`);
      return;
    }

    console.log('\n=== Session Information ===');
    console.log('Session ID:', session.id);
    console.log('Status:', session.status);
    console.log('\n=== selectedIds Field ===');
    console.log('Type:', typeof session.selectedIds);
    console.log('Is Array:', Array.isArray(session.selectedIds));
    console.log('Raw Value:', JSON.stringify(session.selectedIds, null, 2));
    
    if (Array.isArray(session.selectedIds)) {
      console.log('\n=== selectedIds Details ===');
      console.log('Length:', session.selectedIds.length);
      session.selectedIds.forEach((id, index) => {
        console.log(`[${index}]:`, id, '(type:', typeof id, ')');
      });
    }

    // conceptsフィールドも確認
    if (session.concepts) {
      console.log('\n=== concepts Field (for comparison) ===');
      const conceptsData = typeof session.concepts === 'string' 
        ? JSON.parse(session.concepts) 
        : session.concepts;
      
      if (conceptsData.concepts && Array.isArray(conceptsData.concepts)) {
        console.log('Number of concepts:', conceptsData.concepts.length);
        conceptsData.concepts.forEach((concept, index) => {
          console.log(`Concept ${index}:`, concept.title);
        });
      }
    }

    // 他のセッションのselectedIdsも確認
    console.log('\n=== Other Sessions with selectedIds ===');
    const otherSessions = await prisma.viralSession.findMany({
      where: {
        selectedIds: {
          isEmpty: false
        }
      },
      select: {
        id: true,
        selectedIds: true,
        status: true
      },
      take: 5
    });

    otherSessions.forEach(s => {
      console.log(`\nSession ${s.id}:`);
      console.log('Status:', s.status);
      console.log('selectedIds:', JSON.stringify(s.selectedIds));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSelectedIds();