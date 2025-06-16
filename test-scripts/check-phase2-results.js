// Phase 2の結果を確認するスクリプト
const sessionId = '56bfad58-7c2a-4d07-96bf-497565ae84e7';

async function checkPhase2() {
  try {
    const response = await fetch(`http://localhost:3001/api/viral/cot-session/${sessionId}`);
    const session = await response.json();
    
    console.log('Session Status:', session.status);
    console.log('Current Phase:', session.currentPhase);
    console.log('Current Step:', session.currentStep);
    
    // Phase 1の結果確認
    if (session.phase1Results?.integrate) {
      console.log('\n✅ Phase 1 Complete:');
      console.log('- Opportunities found:', session.phase1Results.integrate.opportunities?.length || 0);
      if (session.phase1Results.integrate.opportunities?.length > 0) {
        console.log('\nFirst opportunity:');
        const opp = session.phase1Results.integrate.opportunities[0];
        console.log('- Topic:', opp.topic);
        console.log('- Viral Score:', opp.viralScore);
        console.log('- Reasoning:', opp.reasoning?.substring(0, 100) + '...');
      }
    }
    
    // Phase 2の結果確認
    if (session.phase2Results) {
      console.log('\n✅ Phase 2 Complete:');
      const results = session.phase2Results;
      console.log('- Has opportunities:', !!results.opportunities);
      if (results.opportunities?.length > 0) {
        console.log('\nEvaluated opportunities:');
        results.opportunities.forEach((opp, i) => {
          console.log(`\n${i + 1}. ${opp.topic}`);
          console.log('   - Viral Velocity:', JSON.stringify(opp.viralVelocity || {}));
          console.log('   - Content Angles:', opp.contentAngles?.length || 0);
        });
      }
    } else {
      console.log('\n⏳ Phase 2 not yet complete');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkPhase2();