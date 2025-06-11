const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function testSpecificQueries() {
  console.log('=== Twitter検索クエリの詳細テスト ===\n');
  
  // より厳密なテストクエリ
  const testQueries = [
    {
      name: 'ChatGPT具体的活用（厳密版）',
      query: '"ChatGPTで" (作成 OR 自動化 OR 効率化) (時間 OR 業務) -アニメ -ゲーム -キャラクター -声優 -プリキュア -プリパラ -アイカツ lang:ja min_faves:1000'
    },
    {
      name: 'AI業務効率化（実例のみ）',
      query: '(ChatGPT OR Claude) 使って (時間短縮 OR 効率化) (実際に OR 結果) -キャラクター -アニメ -ゲーム -紹介 -CV lang:ja min_faves:500'
    },
    {
      name: 'プロンプトエンジニアリング実践',
      query: 'プロンプト (書き方 OR テクニック OR コツ) (ChatGPT OR Claude) -キャラクター -アニメ -ゲーム lang:ja min_faves:800'
    },
    {
      name: 'AI副業・収益化（数値あり）',
      query: '(ChatGPT OR AI) (副業 OR 収益) 月 万円 -キャラクター -アニメ -ゲーム -プレゼント lang:ja min_faves:1000'
    },
    {
      name: 'Copilot/Cursor開発効率化',
      query: '("GitHub Copilot" OR Cursor) (コード OR 開発) (効率 OR 速い OR 便利) -キャラクター -アニメ lang:ja min_faves:300'
    }
  ];
  
  const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs';
  
  for (const testQuery of testQueries) {
    console.log(`\n📍 テスト: ${testQuery.name}`);
    console.log(`   クエリ: ${testQuery.query}`);
    console.log('   結果を取得中...\n');
    
    try {
      // Kaito API呼び出し
      const response = await fetch(`${KAITO_API_URL}?token=${process.env.KAITO_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twitterContent: testQuery.query,
          maxItems: 5,
          lang: 'ja',
          'filter:replies': false,
          'filter:nativeretweets': false,
          queryType: 'Latest'
        }),
      });
      
      if (!response.ok) {
        console.error(`❌ API エラー: ${response.statusText}`);
        continue;
      }
      
      const data = await response.json();
      const runId = data.data.id;
      
      // 結果を待つ
      let results = null;
      let retries = 0;
      
      while (retries < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultResponse = await fetch(
          `https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs/${runId}?token=${process.env.KAITO_API_KEY}`
        );
        
        const runData = await resultResponse.json();
        
        if (runData.data.status === 'SUCCEEDED') {
          const datasetId = runData.data.defaultDatasetId;
          const itemsResponse = await fetch(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.KAITO_API_KEY}`
          );
          results = await itemsResponse.json();
          break;
        } else if (runData.data.status === 'FAILED') {
          console.error('❌ API実行失敗');
          break;
        }
        
        retries++;
      }
      
      if (results && results.length > 0) {
        console.log(`✅ ${results.length}件の結果を取得\n`);
        
        // 各ツイートを表示
        results.forEach((tweet, index) => {
          if (index < 3) { // 上位3件のみ表示
            console.log(`--- ツイート ${index + 1} ---`);
            console.log(`👤 @${tweet.author?.userName || 'unknown'}`);
            console.log(`📝 ${tweet.text || ''}`);
            console.log(`💙 ${tweet.likeCount || 0} | 🔄 ${tweet.retweetCount || 0} | 👁 ${tweet.viewCount || 0}`);
            
            // コンテンツチェック
            const content = tweet.text || '';
            const hasAnimeContent = ['アニメ', 'キャラクター', 'CV', '声優', 'プリパラ', 'アイカツ'].some(word => content.includes(word));
            const hasAIContent = ['ChatGPT', 'Claude', 'AI', 'プロンプト', '効率化', '自動化'].some(word => content.includes(word));
            
            if (hasAnimeContent) {
              console.log('⚠️  警告: アニメ関連コンテンツが含まれています');
            }
            if (!hasAIContent) {
              console.log('⚠️  警告: AI関連キーワードが含まれていません');
            }
            console.log('');
          }
        });
      } else {
        console.log('❌ 結果が取得できませんでした');
      }
      
    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
    }
  }
  
  await prisma.$disconnect();
}

testSpecificQueries().catch(console.error);