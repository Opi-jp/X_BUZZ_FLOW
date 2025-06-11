const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testKaitoSimple() {
  console.log('=== Kaito APIシンプルテスト ===\n');
  
  const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs';
  const KAITO_API_KEY = process.env.KAITO_API_KEY;
  
  // シンプルなテストクエリ
  const testQuery = 'ChatGPT 効率化 min_faves:1000 -is:retweet lang:ja';
  
  console.log('テストクエリ:', testQuery);
  console.log('APIキー:', KAITO_API_KEY ? '設定済み' : '未設定');
  console.log('\nAPIを呼び出し中...\n');
  
  try {
    const response = await fetch(`${KAITO_API_URL}?token=${KAITO_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitterContent: testQuery,
        maxItems: 5,
        lang: 'ja',
        'filter:replies': false,
        'filter:nativeretweets': false,
        queryType: 'Latest'
      }),
    });
    
    console.log('レスポンスステータス:', response.status);
    const responseText = await response.text();
    console.log('レスポンス内容:', responseText.substring(0, 500));
    
    if (!response.ok) {
      console.error('APIエラー:', response.statusText);
      return;
    }
    
    const data = JSON.parse(responseText);
    const runId = data.data?.id;
    
    if (!runId) {
      console.error('Run IDが取得できませんでした');
      return;
    }
    
    console.log('Run ID:', runId);
    console.log('\n結果を待機中...');
    
    // 結果を待つ
    let retries = 0;
    while (retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      process.stdout.write('.');
      
      const resultResponse = await fetch(
        `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs/${runId}?token=${KAITO_API_KEY}`
      );
      
      const runData = await resultResponse.json();
      
      if (runData.data.status === 'SUCCEEDED') {
        console.log('\n\n✅ 実行成功！');
        
        const datasetId = runData.data.defaultDatasetId;
        const itemsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${KAITO_API_KEY}`
        );
        const results = await itemsResponse.json();
        
        console.log(`\n取得件数: ${results.length}件\n`);
        
        // 最初の3件を表示
        results.slice(0, 3).forEach((tweet, index) => {
          console.log(`--- ツイート ${index + 1} ---`);
          console.log(`👤 @${tweet.author?.userName || 'unknown'}`);
          console.log(`📝 ${(tweet.text || '').substring(0, 200)}...`);
          console.log(`💙 ${tweet.likeCount || 0} | 🔄 ${tweet.retweetCount || 0} | 👁 ${tweet.viewCount || 0}`);
          console.log('');
        });
        
        break;
      } else if (runData.data.status === 'FAILED') {
        console.log('\n\n❌ 実行失敗');
        console.log('エラーメッセージ:', runData.data.statusMessage);
        break;
      }
      
      retries++;
    }
    
    if (retries >= 30) {
      console.log('\n\n⏱ タイムアウト');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

testKaitoSimple().catch(console.error);