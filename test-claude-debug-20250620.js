// Claudeフローのデバッグテスト
async function debugClaudeFlow() {
  try {
    console.log('🔍 Claude APIデバッグテスト');
    
    // 1. 簡単なfetch呼び出し
    console.log('\n1️⃣ シンプルなAPI呼び出し...');
    const response = await fetch('http://localhost:3000/api/create/flow/sess_j2aTllyraxSi/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selectedConceptIds: ['conc_f8N_K6kM8SB2'],
        characterId: 'cardi-dare'
      })
    });
    
    console.log('  ステータス:', response.status);
    console.log('  ステータステキスト:', response.statusText);
    
    // レスポンスボディを取得
    const text = await response.text();
    console.log('  レスポンス:', text);
    
    // JSONとしてパースを試みる
    try {
      const json = JSON.parse(text);
      console.log('  パース成功:', json);
    } catch (e) {
      console.log('  JSONパース失敗');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

// 実行
debugClaudeFlow();