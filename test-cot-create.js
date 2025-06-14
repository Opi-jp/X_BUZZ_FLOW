// CoTセッション作成のテスト
async function testCotCreate() {
  const testData = {
    expertise: 'AIと働き方',
    style: '洞察的',
    platform: 'Twitter'
  };

  console.log('=== CoTセッション作成テスト ===');
  console.log('設定:', testData);
  console.log('\nPOST /api/viral/cot-session/create');
  
  try {
    const response = await fetch('http://localhost:3000/api/viral/cot-session/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('エラー:', response.status, error);
      return;
    }

    const result = await response.json();
    console.log('\n作成されたセッション:');
    console.log('- セッションID:', result.sessionId);
    console.log('- ステータス:', result.session?.status);
    
    // Phase 1を開始
    if (result.sessionId) {
      console.log('\n=== Phase 1 処理開始 ===');
      const processResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${result.sessionId}/process`, {
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
      console.log('\nPhase 1 - Think 結果:');
      
      // Think結果を表示
      if (processResult.result?.queries) {
        console.log(`\n生成されたクエリ数: ${processResult.result.queries.length}`);
        processResult.result.queries.forEach((q, i) => {
          console.log(`\nクエリ ${i + 1}:`);
          console.log(`- カテゴリ: ${q.category}`);
          console.log(`- トピック: ${q.topic}`);
          console.log(`- 英語: ${q.query}`);
          console.log(`- 日本語: ${q.queryJa}`);
          console.log(`- 意図: ${q.intent}`);
        });
      }
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

// 実行
testCotCreate();