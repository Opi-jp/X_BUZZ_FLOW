// CoTセッションを完全に実行するスクリプト
const sessionId = '56bfad58-7c2a-4d07-96bf-497565ae84e7';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFullSession() {
  console.log('🚀 Starting CoT Session:', sessionId);
  console.log('Config: AIと働き方 / Twitter / 洞察的\n');
  
  let continueProcessing = true;
  let iteration = 0;
  
  while (continueProcessing && iteration < 20) {
    iteration++;
    console.log(`\n--- Iteration ${iteration} ---`);
    
    try {
      // 処理を実行
      const processResponse = await fetch(`http://localhost:3001/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await processResponse.json();
      
      if (result.success) {
        console.log(`✅ Phase ${result.phase} - ${result.step || result.nextStep}`);
        console.log(`   Status: ${result.currentStatus} → ${result.nextStatus || result.status}`);
        
        if (result.duration) {
          console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
        }
        
        if (result.nextAction) {
          console.log(`   Next: ${result.nextAction.message}`);
        }
        
        // 完了チェック
        if (result.isCompleted || result.phase === 5) {
          console.log('\n🎉 Session completed!');
          continueProcessing = false;
        } else {
          // 次の処理まで待機
          const waitTime = result.nextAction?.waitTime || 3000;
          console.log(`   Waiting ${waitTime}ms...`);
          await sleep(waitTime);
        }
      } else {
        console.error('❌ Error:', result.error || result.message);
        
        // エラーの場合も少し待ってリトライ
        if (result.message === '処理中です') {
          console.log('   Session is processing, waiting 10s...');
          await sleep(10000);
        } else {
          continueProcessing = false;
        }
      }
      
    } catch (error) {
      console.error('❌ Request error:', error.message);
      continueProcessing = false;
    }
  }
  
  // 最終的なセッション状態を確認
  console.log('\n\n📊 Final Session Status:');
  try {
    const finalResponse = await fetch(`http://localhost:3001/api/viral/cot-session/${sessionId}`);
    const finalSession = await finalResponse.json();
    
    console.log('Status:', finalSession.status);
    console.log('Phase:', finalSession.currentPhase);
    console.log('Step:', finalSession.currentStep);
    
    // 下書きの確認
    if (finalSession.drafts && finalSession.drafts.length > 0) {
      console.log(`\n📝 Created ${finalSession.drafts.length} drafts:`);
      finalSession.drafts.forEach((draft, index) => {
        console.log(`${index + 1}. ${draft.hook?.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('Failed to fetch final status:', error.message);
  }
}

// 実行
runFullSession().catch(console.error);