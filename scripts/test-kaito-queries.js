const fetch = require('node-fetch');

async function testKaitoQueries() {
  const KAITO_API_KEY = process.env.KAITO_API_KEY || 'apify_api_5lDHCeZNobXJJdKr8M8UWbnF8gkVAq1tsV04';
  const API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs';
  
  // テストする検索クエリ
  const testQueries = [
    {
      name: 'AI×クリエイティブ（シンプル）',
      query: 'AI クリエイティブ min_faves:1000 -is:retweet lang:ja'
    },
    {
      name: 'AI×クリエイティブ（詳細）',
      query: '(AI OR ChatGPT OR Claude) (クリエイティブ OR デザイン OR 制作) (活用 OR 使い方 OR 実践) min_faves:800 -is:retweet lang:ja'
    },
    {
      name: 'ChatGPT/Claude活用',
      query: '(ChatGPT OR Claude) (活用 OR 使い方 OR やり方) (実際 OR 実践 OR 効果) min_faves:1500 -is:retweet lang:ja'
    }
  ];
  
  for (const test of testQueries) {
    console.log('\n' + '='.repeat(60));
    console.log(`テスト: ${test.name}`);
    console.log(`クエリ: ${test.query}`);
    console.log('='.repeat(60) + '\n');
    
    try {
      // APIリクエスト
      const requestBody = {
        "twitterContent": test.query,
        "maxItems": 3,
        "lang": "ja",
        "filter:replies": false,
        "filter:nativeretweets": false,
        "queryType": "Latest"
      };
      
      const response = await fetch(`${API_URL}?token=${KAITO_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const runId = data.data.id;
      console.log('実行開始:', runId);
      
      // 結果を待つ
      let retries = 0;
      const maxRetries = 30;
      
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${KAITO_API_KEY}`
        );
        
        const runData = await statusResponse.json();
        
        if (runData.data.status === 'SUCCEEDED') {
          const datasetId = runData.data.defaultDatasetId;
          const itemsResponse = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${KAITO_API_KEY}`
          );
          
          const results = await itemsResponse.json();
          console.log(`\n結果: ${results.length}件取得\n`);
          
          // 各ツイートの詳細を表示
          results.forEach((tweet, index) => {
            console.log(`--- ツイート ${index + 1} ---`);
            console.log('投稿者:', tweet.author?.userName || '不明');
            console.log('フォロワー:', tweet.author?.followersCount || 0);
            console.log('内容:', tweet.text?.substring(0, 100) + '...');
            console.log('いいね:', tweet.likeCount || 0);
            console.log('RT:', tweet.retweetCount || 0);
            console.log('表示回数:', tweet.viewCount || 0);
            
            // 関連性チェック
            const text = tweet.text || '';
            const hasAI = text.includes('AI') || text.includes('ChatGPT') || text.includes('Claude');
            const hasCreative = text.includes('クリエイティブ') || text.includes('デザイン') || text.includes('制作');
            const hasPractice = text.includes('活用') || text.includes('使い方') || text.includes('実践');
            
            console.log('\n関連性チェック:');
            console.log('- AI関連:', hasAI ? '✓' : '✗');
            console.log('- クリエイティブ関連:', hasCreative ? '✓' : '✗');
            console.log('- 実践的:', hasPractice ? '✓' : '✗');
            
            // エンゲージメント率
            if (tweet.viewCount > 0) {
              const engagementRate = ((tweet.likeCount + tweet.retweetCount) / tweet.viewCount * 100).toFixed(2);
              console.log('エンゲージメント率:', engagementRate + '%');
            }
            
            console.log('\n');
          });
          
          break;
        } else if (runData.data.status === 'FAILED') {
          throw new Error(`失敗: ${runData.data.statusMessage}`);
        }
        
        retries++;
        process.stdout.write('.');
      }
      
      if (retries >= maxRetries) {
        throw new Error('タイムアウト');
      }
      
    } catch (error) {
      console.error('エラー:', error.message);
    }
    
    // 次のテストまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n全てのテストが完了しました。');
}

testKaitoQueries();