// Kaito APIのテストスクリプト
const fs = require('fs');
const path = require('path');

// .env.localから環境変数を読み込む
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

for (const line of envLines) {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
}

const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs';

async function testKaitoAPI() {
  console.log('=== Kaito API テスト開始 ===\n');
  
  // APIキーの確認
  if (!process.env.KAITO_API_KEY) {
    console.error('❌ KAITO_API_KEY が設定されていません');
    return;
  }
  console.log('✅ KAITO_API_KEY: 設定済み');
  
  // テスト用のシンプルなクエリ
  const testQuery = 'ChatGPT min_faves:1000 min_retweets:100 -is:retweet lang:ja';
  console.log(`\nテストクエリ: "${testQuery}"`);
  
  try {
    // 1. Kaito APIを呼び出し
    console.log('\n1. APIリクエスト送信中...');
    const response = await fetch(`${KAITO_API_URL}?token=${process.env.KAITO_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitterContent: testQuery,
        maxItems: 5, // テストなので5件のみ
        lang: 'ja',
        'filter:replies': false,
        'filter:nativeretweets': false,
        queryType: 'Latest',
      }),
    });

    if (!response.ok) {
      console.error(`❌ APIエラー: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('エラー詳細:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ APIレスポンス受信');
    console.log('Run ID:', data.data.id);
    
    // 2. 結果を取得（ポーリング）
    console.log('\n2. 結果を取得中...');
    let results = null;
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultResponse = await fetch(
        `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs/${data.data.id}?token=${process.env.KAITO_API_KEY}`
      );
      
      const runData = await resultResponse.json();
      console.log(`ステータス: ${runData.data.status} (${retries + 1}/${maxRetries})`);
      
      if (runData.data.status === 'SUCCEEDED') {
        const datasetId = runData.data.defaultDatasetId;
        const itemsResponse = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
        );
        results = await itemsResponse.json();
        console.log(`✅ ${results.length}件のツイートを取得`);
        break;
      } else if (runData.data.status === 'FAILED') {
        console.error('❌ 実行失敗:', runData.data.statusMessage);
        return;
      }
      
      retries++;
    }
    
    if (!results) {
      console.error('❌ タイムアウト');
      return;
    }
    
    // 3. 結果の詳細を表示
    console.log('\n3. 取得したツイートの詳細:\n');
    results.forEach((tweet, index) => {
      console.log(`--- ツイート ${index + 1} ---`);
      console.log('ID:', tweet.id);
      console.log('ID Type:', typeof tweet.id);
      console.log('Text:', tweet.text?.substring(0, 100) + '...');
      console.log('Author:', {
        userName: tweet.author?.userName,
        id: tweet.author?.id,
        followersCount: tweet.author?.followersCount,
        verified: tweet.author?.verified
      });
      console.log('Stats:', {
        likes: tweet.likeCount || tweet.favorite_count,
        retweets: tweet.retweetCount || tweet.retweet_count,
        replies: tweet.replyCount || tweet.reply_count,
        impressions: tweet.viewCount || tweet.impressions_count
      });
      console.log('Created At:', tweet.createdAt || tweet.created_at);
      console.log('');
    });
    
    console.log('✅ Kaito APIテスト完了！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

testKaitoAPI();