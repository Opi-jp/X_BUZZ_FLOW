// Phase 1 Google検索付き完全テスト
async function testPhase1WithSearch() {
  console.log('=== Phase 1 検索テスト ===\n');
  
  // 1. 新規セッション作成
  const createResponse = await fetch('http://localhost:3000/api/viral/cot-session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expertise: 'AIと働き方',
      style: '洞察的',
      platform: 'Twitter'
    })
  });

  const { sessionId } = await createResponse.json();
  console.log('セッションID:', sessionId);

  // 2. Phase 1 - Think
  console.log('\n=== Phase 1 - Think ===');
  let response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST'
  });
  
  let result = await response.json();
  const queries = result.result?.queries || [];
  console.log(`生成されたクエリ数: ${queries.length}`);
  queries.forEach((q, i) => {
    console.log(`${i+1}. [${q.category}] ${q.query}`);
  });

  // 3. Phase 1 - Execute (Google検索)
  console.log('\n=== Phase 1 - Execute (Google検索) ===');
  response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST'
  });
  
  result = await response.json();
  
  // デバッグ情報
  console.log('\nデバッグ情報:');
  console.log('- レスポンスステータス:', response.status);
  console.log('- result.result のキー:', Object.keys(result.result || {}));
  console.log('- searchResults数:', result.result?.searchResults?.length || 0);
  console.log('- searchResultsForDB数:', result.result?.searchResultsForDB?.length || 0);
  
  const searchResults = result.result?.searchResults || [];
  const searchResultsForDB = result.result?.searchResultsForDB || [];
  
  console.log(`\n検索結果: ${searchResults.length}件`);
  console.log(`DB保存用データ: ${searchResultsForDB.length}件`);
  
  if (searchResults.length > 0) {
    console.log('\n=== 検索結果サンプル ===');
    searchResults.slice(0, 3).forEach((r, i) => {
      console.log(`\n${i+1}. ${r.title}`);
      console.log(`   ${r.snippet.substring(0, 100)}...`);
      console.log(`   URL: ${r.url}`);
    });
  }
  
  if (searchResultsForDB.length > 0) {
    console.log('\n=== DB保存データサンプル ===');
    const sample = searchResultsForDB[0];
    console.log('クエリ:', sample.query);
    console.log('タイトル:', sample.title);
    console.log('URL:', sample.url);
    console.log('順位:', sample.position);
  }
  
  // 4. Phase 1 - Integrate
  console.log('\n=== Phase 1 - Integrate (GPT分析) ===');
  response = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST'
  });
  
  result = await response.json();
  const opportunities = result.result?.viralOpportunities || [];
  
  console.log(`\n抽出されたトピック数: ${opportunities.length}`);
  opportunities.forEach((opp, i) => {
    console.log(`\n${i+1}. ${opp.topicName}`);
    console.log(`   要約: ${opp.summary}`);
    console.log(`   推定バズ時間帯: ${opp.estimatedBuzzTiming}`);
    console.log(`   バイラルスコア: ${opp.viralScore}`);
  });
}

testPhase1WithSearch().catch(console.error);