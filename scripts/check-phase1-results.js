const sessionId = process.argv[2] || '2d922f7e-6a28-4b58-97f2-4a77827ef966';

async function checkPhase1Results() {
  try {
    const response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}`);
    const data = await response.json();
    
    console.log('\n=== Session Status ===');
    console.log('ID:', data.id);
    console.log('Status:', data.status);
    console.log('Current Phase:', data.currentPhase);
    console.log('Current Step:', data.currentStep);
    
    const phase1 = data.phases[0];
    if (phase1) {
      console.log('\n=== Phase 1 Results ===');
      console.log('Status:', phase1.status);
      
      if (phase1.thinkResult) {
        console.log('\nTHINK Result:');
        const questions = phase1.thinkResult.perplexityQuestions || [];
        console.log('Generated questions:', questions.length);
        if (questions[0]) {
          console.log('First question:', questions[0].question.substring(0, 100) + '...');
        }
      }
      
      if (phase1.executeResult) {
        console.log('\nEXECUTE Result:');
        const executeResult = phase1.executeResult;
        console.log('Search method:', executeResult.searchMethod);
        console.log('Search results:', executeResult.searchResults?.length || 0);
        
        if (executeResult.searchResults && executeResult.searchResults[0]) {
          const firstResult = executeResult.searchResults[0];
          console.log('\nFirst search result structure:');
          console.log('Keys:', Object.keys(firstResult));
          console.log('Has content:', !!firstResult.content);
          console.log('Has citations:', !!firstResult.citations);
          console.log('Has searchResults:', !!firstResult.searchResults);
        }
      }
    }
    
    const phase2 = data.phases[1];
    if (phase2) {
      console.log('\n=== Phase 2 Status ===');
      console.log('Status:', phase2.status);
      console.log('Has THINK result:', !!phase2.thinkResult);
      console.log('Has INTEGRATE result:', !!phase2.integrateResult);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPhase1Results();