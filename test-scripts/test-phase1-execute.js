// Phase 1 Executeのテスト
async function testPhase1Execute() {
  const sessionId = '41172b53-1768-455a-9d00-a1b037a29cce';
  
  console.log('=== Phase 1 Execute テスト ===');
  console.log('セッションID:', sessionId);
  
  try {
    // 現在のセッション状態を確認
    const sessionResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}`);
    if (!sessionResponse.ok) {
      console.error('セッション取得エラー:', sessionResponse.status);
      return;
    }
    
    const session = await sessionResponse.json();
    console.log('\n現在のステータス:', session.status);
    console.log('現在のフェーズ:', session.currentPhase);
    console.log('現在のステップ:', session.currentStep);
    
    // Executeステップを実行
    if (session.currentStep === 'EXECUTE' || session.currentStep === 'THINK') {
      console.log('\n=== Phase 1 Execute 実行 ===');
      const processResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!processResponse.ok) {
        const error = await processResponse.text();
        console.error('処理エラー:', processResponse.status, error);
        return;
      }

      const processResult = await processResponse.json();
      console.log('\n処理結果:');
      console.log('- フェーズ:', processResult.phase);
      console.log('- ステップ:', processResult.step);
      console.log('- 次のステップ:', processResult.nextStep);
      
      // Execute結果を確認
      if (processResult.result?.searchResults) {
        console.log(`\n検索結果数: ${processResult.result.searchResults.length}`);
        console.log('\n最初の5件:');
        processResult.result.searchResults.slice(0, 5).forEach((r, i) => {
          console.log(`\n${i + 1}. ${r.title}`);
          console.log(`   ${r.snippet.substring(0, 100)}...`);
          console.log(`   URL: ${r.url}`);
          console.log(`   ソース: ${r.source}`);
        });
      }
      
      // DB保存用データの確認
      if (processResult.result?.searchResultsForDB) {
        console.log(`\nDB保存用データ数: ${processResult.result.searchResultsForDB.length}`);
      }
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
testPhase1Execute();