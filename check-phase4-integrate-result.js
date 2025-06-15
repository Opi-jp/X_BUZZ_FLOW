const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function checkPhase4Result() {
  try {
    // Check Phase 3 first
    const phase3 = await prisma.cotPhase.findFirst({
      where: {
        sessionId: 'a2a3c490-c41d-4db8-964c-7964c83f21b7',
        phaseNumber: 3
      }
    });

    console.log('=== Phase 3 Concepts ===');
    if (phase3) {
      console.log('Phase 3 Status:', phase3.status);
      
      // Check executeResult
      if (phase3.executeResult && phase3.executeResult.concepts) {
        console.log('Number of concepts in executeResult:', phase3.executeResult.concepts.length);
        phase3.executeResult.concepts.forEach((concept, idx) => {
          console.log(`\nConcept ${idx + 1}:`);
          console.log('- ID:', concept.id);
          console.log('- Title:', concept.title);
        });
      }
      
      // Check integrateResult
      if (phase3.integrateResult && phase3.integrateResult.concepts) {
        console.log('\nNumber of concepts in integrateResult:', phase3.integrateResult.concepts.length);
        phase3.integrateResult.concepts.forEach((concept, idx) => {
          console.log(`\nConcept ${idx + 1}:`);
          console.log('- ID:', concept.id);
          console.log('- Title:', concept.title);
        });
      }
    }

    console.log('\n=== Phase 4 Result ===');
    const phase = await prisma.cotPhase.findFirst({
      where: {
        sessionId: 'a2a3c490-c41d-4db8-964c-7964c83f21b7',
        phaseNumber: 4
      }
    });

    if (!phase) {
      console.log('Phase 4 not found for this session');
      return;
    }

    console.log('Phase 4 Status:', phase.status);
    console.log('\nIntegrate Result Structure:');
    
    if (phase.integrateResult) {
      // Pretty print the JSON structure
      console.log(JSON.stringify(phase.integrateResult, null, 2));
      
      // Check specific fields
      const result = phase.integrateResult;
      console.log('\n=== Analysis ===');
      
      if (result.completeContent) {
        if (Array.isArray(result.completeContent)) {
          console.log('completeContent is an ARRAY with', result.completeContent.length, 'items');
          result.completeContent.forEach((content, idx) => {
            console.log(`\nContent ${idx + 1}:`);
            console.log('- Has conceptId:', !!content.conceptId);
            console.log('- Has content:', !!content.content);
            console.log('- Content length:', content.content ? content.content.length : 0);
            if (content.conceptId) {
              console.log('- conceptId:', content.conceptId);
            }
          });
        } else {
          console.log('completeContent is a SINGLE OBJECT (not an array)');
          console.log('- Keys:', Object.keys(result.completeContent));
        }
      } else {
        console.log('No completeContent field found');
        console.log('Available fields:', Object.keys(result));
      }
    } else {
      console.log('No integrateResult found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhase4Result();