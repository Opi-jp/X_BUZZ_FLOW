const { prisma } = require('./lib/prisma.ts');

(async () => {
  const session = await prisma.cotSession.findUnique({
    where: { id: '2cf500f3-2ece-4961-a7f5-dc3ef011ae38' },
    include: { phases: true }
  });
  
  if (session) {
    console.log('Session status:', session.status);
    console.log('Current phase:', session.currentPhase);
    console.log('Current step:', session.currentStep);
    
    const phase1 = session.phases.find(p => p.phaseNumber === 1);
    if (phase1) {
      console.log('\nPhase 1 data:');
      console.log('Status:', phase1.status);
      console.log('Think completed:', !!phase1.thinkResult);
      console.log('Execute completed:', !!phase1.executeResult);
      console.log('Integrate completed:', !!phase1.integrateResult);
      
      if (phase1.executeResult) {
        console.log('Execute result has data');
        const data = phase1.executeResult;
        if (data.savedPerplexityResponses) {
          console.log('Perplexity responses count:', data.savedPerplexityResponses.length);
        }
      }
    }
  }
  
  await prisma.$disconnect();
})().catch(console.error);