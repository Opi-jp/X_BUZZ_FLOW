const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function testRealSearch() {
  console.log('=== 実際の検索結果テスト ===\n');
  
  const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs';
  const KAITO_API_KEY = 'apify_api_5lDHCeZNobXJJdKr8M8UWbnF8gkVAq1tsV04';
  
  // データベースから実際のプリセットを取得
  const presets = await prisma.collectionPreset.findMany({
    take: 5, // 最初の5個をテスト
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`${presets.length}個のプリセットをテストします\n`);
  
  for (const preset of presets) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 ${preset.name}`);
    console.log(`   クエリ: ${preset.query}`);
    console.log(`   最小いいね: ${preset.minLikes} | 最小RT: ${preset.minRetweets}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      const response = await fetch(`${KAITO_API_URL}?token=${KAITO_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twitterContent: preset.query,
          maxItems: 10, // 10件取得
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
      console.log('⏳ 結果を取得中...');
      
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
        // Kaito APIのデフォルトメッセージを除外
        const realTweets = results.filter(tweet => 
          tweet.text && !tweet.text.includes('From KaitoEasyAPI, a reminder:')
        );
        
        console.log(`\n✅ ${realTweets.length}件の実際のツイートを取得\n`);
        
        // 上位5件を表示
        realTweets.slice(0, 5).forEach((tweet, index) => {
          console.log(`${'─'.repeat(50)}`);
          console.log(`【${index + 1}】 @${tweet.author?.userName || 'unknown'}`);
          console.log(`\n${tweet.text || ''}\n`);
          console.log(`💙 ${tweet.likeCount || 0} | 🔄 ${tweet.retweetCount || 0} | 👁 ${tweet.viewCount || 0}`);
          
          // エンゲージメント率を計算
          const engagementRate = tweet.viewCount > 0 
            ? ((tweet.likeCount + tweet.retweetCount) / tweet.viewCount * 100).toFixed(2)
            : '0.00';
          console.log(`📊 エンゲージメント率: ${engagementRate}%`);
          
          // 投稿日時
          if (tweet.createdAt) {
            const date = new Date(tweet.createdAt);
            console.log(`📅 ${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP')}`);
          }
          
          // コンテンツ品質チェック
          const content = tweet.text || '';
          const aiKeywords = ['AI', 'ChatGPT', 'Claude', '生成AI', 'プロンプト', '効率化', '自動化', 'Midjourney', 'Copilot', 'Cursor'];
          const foundKeywords = aiKeywords.filter(keyword => content.includes(keyword));
          
          if (foundKeywords.length > 0) {
            console.log(`✅ AI関連キーワード: ${foundKeywords.join(', ')}`);
          } else {
            console.log(`⚠️  AI関連キーワードが見つかりません`);
          }
        });
        
        // 統計情報
        console.log(`\n${'─'.repeat(50)}`);
        console.log('📊 統計情報:');
        const avgLikes = Math.round(realTweets.reduce((sum, t) => sum + (t.likeCount || 0), 0) / realTweets.length);
        const avgRetweets = Math.round(realTweets.reduce((sum, t) => sum + (t.retweetCount || 0), 0) / realTweets.length);
        const avgViews = Math.round(realTweets.reduce((sum, t) => sum + (t.viewCount || 0), 0) / realTweets.length);
        
        console.log(`   平均いいね数: ${avgLikes}`);
        console.log(`   平均RT数: ${avgRetweets}`);
        console.log(`   平均表示回数: ${avgViews}`);
        
      } else {
        console.log('❌ 結果が取得できませんでした');
      }
      
    } catch (error) {
      console.error('❌ エラー:', error.message);
    }
    
    // API制限を考慮して少し待つ
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  await prisma.$disconnect();
}

testRealSearch().catch(console.error);