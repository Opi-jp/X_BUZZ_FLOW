async function testKaitoDirect() {
  console.log('=== Kaito API 直接テスト ===\n');
  
  const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs';
  const KAITO_API_KEY = 'apify_api_5lDHCeZNobXJJdKr8M8UWbnF8gkVAq1tsV04'; // 提供されたAPIキー
  
  // テストクエリ
  const testQueries = [
    {
      name: 'ChatGPT効率化',
      query: 'ChatGPT 効率化 min_faves:1000 -is:retweet lang:ja'
    },
    {
      name: 'Claude使い方',
      query: 'Claude 使い方 min_faves:500 -is:retweet lang:ja'
    },
    {
      name: 'プロンプト技術',
      query: 'プロンプト ChatGPT min_faves:800 -is:retweet lang:ja'
    }
  ];
  
  for (const test of testQueries) {
    console.log(`\n📍 テスト: ${test.name}`);
    console.log(`   クエリ: ${test.query}`);
    
    try {
      const response = await fetch(`${KAITO_API_URL}?token=${KAITO_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twitterContent: test.query,
          maxItems: 5,
          lang: 'ja',
          'filter:replies': false,
          'filter:nativeretweets': false,
          queryType: 'Latest'
        }),
      });
      
      if (!response.ok) {
        console.error(`❌ APIエラー: ${response.status} ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      const runId = data.data.id;
      console.log(`   Run ID: ${runId}`);
      console.log('   結果を待機中...');
      
      // 結果を待つ
      let retries = 0;
      let results = null;
      
      while (retries < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const resultResponse = await fetch(
          `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs/${runId}?token=${KAITO_API_KEY}`
        );
        
        const runData = await resultResponse.json();
        
        if (runData.data.status === 'SUCCEEDED') {
          const datasetId = runData.data.defaultDatasetId;
          const itemsResponse = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${KAITO_API_KEY}`
          );
          results = await itemsResponse.json();
          break;
        } else if (runData.data.status === 'FAILED') {
          console.error('❌ 実行失敗:', runData.data.statusMessage);
          break;
        }
        
        retries++;
      }
      
      if (results && results.length > 0) {
        console.log(`\n✅ ${results.length}件の結果を取得`);
        
        // 上位3件を表示
        results.slice(0, 3).forEach((tweet, index) => {
          console.log(`\n--- ツイート ${index + 1} ---`);
          console.log(`👤 @${tweet.author?.userName || 'unknown'}`);
          console.log(`📝 ${(tweet.text || '').substring(0, 200)}`);
          if (tweet.text && tweet.text.length > 200) console.log('...');
          console.log(`💙 ${tweet.likeCount || 0} | 🔄 ${tweet.retweetCount || 0} | 👁 ${tweet.viewCount || 0}`);
          
          // コンテンツチェック
          const content = tweet.text || '';
          const problematicKeywords = ['アニメ', 'キャラクター', '声優', '政治', '選挙', 'ガンダム'];
          const hasProblematicContent = problematicKeywords.some(word => content.includes(word));
          
          if (hasProblematicContent) {
            console.log('⚠️  警告: 無関係なコンテンツが含まれている可能性があります');
          }
        });
      } else {
        console.log('❌ 結果が取得できませんでした');
      }
      
    } catch (error) {
      console.error('❌ エラー:', error.message);
    }
  }
}

testKaitoDirect().catch(console.error);