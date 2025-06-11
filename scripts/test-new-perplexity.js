const fetch = require('node-fetch');

async function testNewPerplexityAnalysis() {
  console.log('=== 新しいPerplexity分析のテスト ===\n');
  
  // 1時間以上前のレポートしかない場合、新規作成されるはず
  const baseUrl = 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/briefing/morning`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        includePerplexity: true,
        includeNews: true,
        includeBuzz: false, // バズは除外してテスト
        timeRange: '24h'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('=== ブリーフィング結果 ===');
    console.log('成功:', data.success);
    
    if (data.briefing?.perplexityInsights) {
      const insights = data.briefing.perplexityInsights;
      console.log('\n--- Perplexity分析 ---');
      console.log('レポートID:', insights.reportId);
      console.log('キャッシュから:', insights.fromCache);
      console.log('バズ予測:', insights.buzzPrediction);
      console.log('トレンド数:', insights.structuredInsights?.trends?.length || 0);
      console.log('パーソナル視点数:', insights.personalAngles?.length || 0);
      console.log('推奨アクション数:', insights.recommendations?.immediateAction?.length || 0);
      
      if (insights.structuredInsights?.trends?.length > 0) {
        console.log('\nトレンド:');
        insights.structuredInsights.trends.forEach((t, i) => {
          console.log(`${i + 1}. ${t}`);
        });
      }
      
      if (insights.personalAngles?.length > 0) {
        console.log('\nパーソナル視点:');
        insights.personalAngles.forEach((a, i) => {
          console.log(`${i + 1}. ${a.angle}`);
        });
      }
    } else {
      console.log('Perplexity分析データなし');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
    console.log('\n※ローカルサーバーが起動していることを確認してください');
    console.log('npm run dev でサーバーを起動してから再実行してください');
  }
}

testNewPerplexityAnalysis();