// Apifyデータセットの確認
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

async function checkApifyDataset() {
  const datasetId = 'aT7MftPQ2l2ogBkEH';
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json`;
  
  console.log('=== Apify Dataset確認 ===\n');
  console.log('URL:', url);
  console.log('');
  
  try {
    // トークンなしでアクセス（公開データセットの場合）
    console.log('1. トークンなしでアクセス...');
    let response = await fetch(url);
    
    if (!response.ok) {
      console.log('❌ トークンなしでは失敗:', response.status);
      
      // トークン付きでアクセス
      console.log('\n2. トークン付きでアクセス...');
      const urlWithToken = `${url}&token=${process.env.KAITO_API_KEY}`;
      response = await fetch(urlWithToken);
    }
    
    if (!response.ok) {
      console.error('❌ アクセス失敗:', response.status, response.statusText);
      return;
    }
    
    console.log('✅ アクセス成功');
    
    const data = await response.json();
    console.log(`\n取得したアイテム数: ${data.length}件`);
    
    if (data.length > 0) {
      console.log('\n--- 最初の3件のデータ ---');
      data.slice(0, 3).forEach((item, index) => {
        console.log(`\n[${index + 1}]`);
        console.log('ID:', item.id);
        console.log('Text:', item.text?.substring(0, 100) + '...');
        console.log('Author:', {
          userName: item.author?.userName,
          followersCount: item.author?.followersCount,
          verified: item.author?.verified
        });
        console.log('Stats:', {
          likes: item.likeCount || item.favorite_count,
          retweets: item.retweetCount || item.retweet_count,
          impressions: item.viewCount || item.impressions_count
        });
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

checkApifyDataset();