// Phase 1のINTEGRATEステップを直接テスト
const sessionId = '2395827e-c1c9-40b6-b17f-06910500c79b';

async function checkSession() {
  try {
    // セッション情報を取得
    const response = await fetch(`http://localhost:3001/api/viral/cot-session/${sessionId}`);
    const session = await response.json();
    
    console.log('Session Status:', session.status);
    console.log('Current Phase:', session.currentPhase);
    console.log('Current Step:', session.currentStep);
    console.log('Error:', session.error);
    
    // Phase 1の結果を確認
    if (session.phase1Results) {
      console.log('\nPhase 1 Results:');
      console.log('- Think:', session.phase1Results.think ? 'Complete' : 'Pending');
      console.log('- Execute:', session.phase1Results.execute ? 'Complete' : 'Pending');
      console.log('- Integrate:', session.phase1Results.integrate ? 'Complete' : 'Pending');
      
      if (session.phase1Results.execute && session.phase1Results.execute.searchResults) {
        console.log('\nSearch Results Count:', session.phase1Results.execute.searchResults.length);
        session.phase1Results.execute.searchResults.forEach((result, index) => {
          console.log(`\n${index + 1}. ${result.topic}`);
          console.log(`   - Category: ${result.category}`);
          console.log(`   - Analysis Length: ${result.analysis ? result.analysis.length : 0} chars`);
        });
      }
    }
    
    // ステータスがINTEGRATINGの場合、もう一度処理を実行
    if (session.status === 'INTEGRATING' || session.status === 'FAILED') {
      console.log('\n\nAttempting to continue processing...');
      const processResponse = await fetch(`http://localhost:3001/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await processResponse.json();
      console.log('\nProcess Result:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSession();