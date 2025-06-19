const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function executeClaudeGeneration() {
  const sessionId = 'cmc35goau00001syek9sxsj5v';
  
  try {
    // セッション情報を取得
    const session = await prisma.viralSession.findUnique({
      where: { id: sessionId }
    });
    
    if (!session) {
      console.log('Session not found');
      return;
    }
    
    console.log('Session found:', {
      id: session.id,
      theme: session.theme,
      status: session.status
    });
    
    if (session.status !== 'CONCEPTS_GENERATED') {
      console.log('Session is not in CONCEPTS_GENERATED status');
      return;
    }
    
    // generate APIを直接実行
    console.log('\nCalling generate API...');
    
    const response = await fetch(`http://localhost:3000/api/generation/content/sessions/${sessionId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        characterId: 'cardi-dare'
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 308) {
      console.log('Got redirect, following...');
      const location = response.headers.get('location');
      console.log('Redirect to:', location);
    }
    
    const result = await response.text();
    console.log('Response:', result.substring(0, 200));
    
    // セッションの状態を再確認
    const updatedSession = await prisma.viralSession.findUnique({
      where: { id: sessionId },
      include: {
        drafts: true
      }
    });
    
    console.log('\nUpdated session status:', updatedSession.status);
    console.log('Drafts count:', updatedSession.drafts.length);
    
    if (updatedSession.contents) {
      console.log('Contents generated!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeClaudeGeneration();