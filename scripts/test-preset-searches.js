// プリセットを使用したKaito API検索テストスクリプト
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../app/generated/prisma');

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

const prisma = new PrismaClient();
const KAITO_API_URL = 'https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs';

// カラフルな出力用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  }
};

async function runKaitoSearch(query, maxItems = 3) {
  try {
    const response = await fetch(`${KAITO_API_URL}?token=${process.env.KAITO_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        twitterContent: query,
        maxItems: maxItems,
        lang: 'ja',
        'filter:replies': false,
        'filter:nativeretweets': false,
        queryType: 'Latest',
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const runId = data.data.id;
    
    // 結果を取得（ポーリング）
    let results = null;
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
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
        throw new Error(`Run failed: ${runData.data.statusMessage}`);
      }
      
      retries++;
    }
    
    if (!results) {
      throw new Error('Timeout waiting for results');
    }
    
    return results;
  } catch (error) {
    console.error('Search error:', error.message);
    return [];
  }
}

function displayTweet(tweet, index) {
  console.log(`\n${colors.fg.cyan}━━━ ツイート ${index + 1} ━━━${colors.reset}`);
  console.log(`${colors.fg.yellow}👤 @${tweet.author?.userName}${colors.reset} (フォロワー: ${tweet.author?.followersCount?.toLocaleString() || 0})`);
  console.log(`${colors.dim}📅 ${new Date(tweet.createdAt || tweet.created_at).toLocaleString('ja-JP')}${colors.reset}`);
  console.log('');
  console.log(`${colors.fg.white}${tweet.text}${colors.reset}`);
  console.log('');
  console.log(`${colors.fg.green}❤️  ${(tweet.likeCount || tweet.favorite_count || 0).toLocaleString()}${colors.reset} | ` +
              `${colors.fg.blue}🔄 ${(tweet.retweetCount || tweet.retweet_count || 0).toLocaleString()}${colors.reset} | ` +
              `${colors.fg.magenta}💬 ${(tweet.replyCount || tweet.reply_count || 0).toLocaleString()}${colors.reset} | ` +
              `${colors.dim}👀 ${(tweet.viewCount || tweet.impressions_count || 0).toLocaleString()}${colors.reset}`);
}

async function testPresetSearches() {
  try {
    console.log(`${colors.bright}${colors.fg.cyan}🔍 プリセット検索テスト開始${colors.reset}\n`);
    
    // APIキーの確認
    if (!process.env.KAITO_API_KEY) {
      console.error(`${colors.fg.red}❌ KAITO_API_KEY が設定されていません${colors.reset}`);
      return;
    }
    
    // プリセットを取得
    const presets = await prisma.collectionPreset.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`${colors.fg.green}✅ ${presets.length}個のプリセットが見つかりました${colors.reset}\n`);
    
    // テストするプリセットを選択（5個まで）
    const testPresets = presets.slice(0, 5);
    
    for (const preset of testPresets) {
      console.log(`\n${colors.bg.blue}${colors.fg.white} ${preset.name} ${colors.reset}`);
      console.log(`${colors.dim}カテゴリ: ${preset.category}${colors.reset}`);
      console.log(`${colors.dim}説明: ${preset.description}${colors.reset}`);
      console.log(`${colors.fg.yellow}クエリ: ${preset.query}${colors.reset}`);
      console.log(`${colors.dim}最小いいね: ${preset.minLikes} | 最小RT: ${preset.minRetweets}${colors.reset}`);
      
      // 検索クエリを構築
      const searchQuery = `${preset.query} min_faves:${preset.minLikes} min_retweets:${preset.minRetweets} -is:retweet lang:ja`;
      console.log(`${colors.fg.cyan}実行クエリ: ${searchQuery}${colors.reset}`);
      
      console.log(`\n${colors.dim}検索中...${colors.reset}`);
      
      // 検索実行
      const results = await runKaitoSearch(searchQuery, 3);
      
      if (results.length === 0) {
        console.log(`${colors.fg.yellow}⚠️  このクエリでは結果が見つかりませんでした${colors.reset}`);
      } else {
        console.log(`${colors.fg.green}✅ ${results.length}件の結果を取得${colors.reset}`);
        
        // 結果を表示（最初の3件のみ、モックデータを除外）
        const realTweets = results.filter(tweet => 
          tweet.author?.userName && 
          !tweet.text?.includes('From KaitoEasyAPI, a reminder:')
        );
        
        realTweets.slice(0, 3).forEach((tweet, index) => {
          displayTweet(tweet, index);
        });
      }
      
      console.log(`\n${colors.dim}${'─'.repeat(80)}${colors.reset}`);
      
      // API制限を考慮して少し待つ
      if (testPresets.indexOf(preset) < testPresets.length - 1) {
        console.log(`\n${colors.dim}次の検索まで3秒待機...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`\n${colors.bright}${colors.fg.green}✅ すべてのテストが完了しました！${colors.reset}`);
    console.log(`${colors.dim}注: これらの結果はデータベースには保存されていません${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.fg.red}❌ エラー:${colors.reset}`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
testPresetSearches();