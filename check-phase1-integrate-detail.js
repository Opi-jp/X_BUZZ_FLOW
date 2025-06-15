// Phase 1のINTEGRATE結果を詳細確認
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function checkPhase1Integrate(sessionId) {
  try {
    const phase1 = await prisma.cotPhase.findFirst({
      where: {
        sessionId: sessionId,
        phaseNumber: 1
      }
    });
    
    if (!phase1) {
      console.error('Phase 1 not found');
      return;
    }
    
    console.log('📌 Phase 1 INTEGRATE Analysis:');
    console.log('- Status:', phase1.status);
    console.log('- Integrate saved at:', phase1.integrateAt);
    
    if (phase1.integrateResult) {
      const integrate = typeof phase1.integrateResult === 'string' 
        ? JSON.parse(phase1.integrateResult) 
        : phase1.integrateResult;
      
      console.log('\n🔍 Integrate Result Structure:');
      console.log('- Type:', typeof integrate);
      console.log('- Keys:', Object.keys(integrate));
      
      // 全体の構造を表示（最初の500文字）
      const jsonStr = JSON.stringify(integrate, null, 2);
      console.log('\n📄 Full Result (first 1000 chars):');
      console.log(jsonStr.substring(0, 1000) + '...');
      
      // opportunitiesフィールドを詳しく確認
      if ('opportunities' in integrate) {
        console.log('\n📊 Opportunities field:');
        console.log('- Type:', typeof integrate.opportunities);
        console.log('- Is Array:', Array.isArray(integrate.opportunities));
        console.log('- Length:', integrate.opportunities?.length || 0);
        
        if (integrate.opportunities && integrate.opportunities.length > 0) {
          console.log('\nFirst opportunity:');
          console.log(JSON.stringify(integrate.opportunities[0], null, 2));
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const sessionId = process.argv[2] || '56bfad58-7c2a-4d07-96bf-497565ae84e7';
checkPhase1Integrate(sessionId);