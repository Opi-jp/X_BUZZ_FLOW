// Phase 1 完全テスト（新規セッション作成から）
async function testPhase1Full() {
  // Step 1: 新しいセッション作成
  console.log('=== 新規CoTセッション作成 ===');
  const testData = {
    expertise: 'AIと働き方',
    style: '洞察的',
    platform: 'Twitter'
  };
  
  const createResponse = await fetch('http://localhost:3000/api/viral/cot-session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });

  if (!createResponse.ok) {
    console.error('セッション作成エラー:', await createResponse.text());
    return;
  }

  const { sessionId } = await createResponse.json();
  console.log('作成されたセッションID:', sessionId);

  // Step 2: Phase 1 - Think
  console.log('\n=== Phase 1 - Think 実行 ===');
  let processResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!processResponse.ok) {
    console.error('Think実行エラー:', await processResponse.text());
    return;
  }

  let result = await processResponse.json();
  console.log('Think完了 - 生成されたクエリ数:', result.result?.queries?.length || 0);

  // Step 3: Phase 1 - Execute（Google検索）
  console.log('\n=== Phase 1 - Execute 実行 ===');
  processResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!processResponse.ok) {
    console.error('Execute実行エラー:', await processResponse.text());
    return;
  }

  result = await processResponse.json();
  const searchResults = result.result?.searchResults || [];
  const searchResultsForDB = result.result?.searchResultsForDB || [];
  
  console.log('\n検索結果:');
  console.log('- 総件数:', searchResults.length);
  console.log('- DB保存用データ数:', searchResultsForDB.length);
  
  console.log('\n=== 検索結果サンプル（最初の5件） ===');
  searchResults.slice(0, 5).forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.title}`);
    console.log(`   ${r.snippet.substring(0, 150)}...`);
    console.log(`   URL: ${r.url}`);
    console.log(`   ソース: ${r.source}`);
  });

  // Step 4: Phase 1 - Integrate（GPT分析）
  console.log('\n\n=== Phase 1 - Integrate 実行 ===');
  processResponse = await fetch(`http://localhost:3000/api/viral/cot-session/${sessionId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!processResponse.ok) {
    console.error('Integrate実行エラー:', await processResponse.text());
    return;
  }

  result = await processResponse.json();
  const viralOpportunities = result.result?.viralOpportunities || [];
  
  console.log('\n=== GPT分析結果 ===');
  console.log('抽出されたトレンドトピック数:', viralOpportunities.length);
  
  viralOpportunities.forEach((opp, i) => {
    console.log(`\n${i + 1}. ${opp.topicName}`);
    console.log(`   要約: ${opp.summary}`);
    console.log(`   推定バズ時間帯: ${opp.estimatedBuzzTiming}`);
    console.log(`   バズ要素:`);
    console.log(`   - 感情: ${opp.buzzElements.emotion}`);
    console.log(`   - 議論性: ${opp.buzzElements.controversy}`);
    console.log(`   - 共感性: ${opp.buzzElements.relatability}`);
    console.log(`   バイラルスコア: ${opp.viralScore}`);
  });
  
  console.log('\n=== Phase 1 完了 ===');
}

// 実行
testPhase1Full().catch(console.error);