#!/usr/bin/env node

const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function checkSourceTweetsUrls() {
  console.log('🔍 source_tweetsフィールドの詳細を確認...\n');
  
  // 最新の投稿済みドラフトを取得
  const postedDrafts = await prisma.viral_drafts.findMany({
    where: { 
      status: 'POSTED',
      posted_at: { not: null },
      source_tweets: { not: null }
    },
    orderBy: { posted_at: 'desc' },
    take: 3,
    select: {
      id: true,
      title: true,
      posted_at: true,
      source_tweets: true
    }
  });
  
  console.log('📊 source_tweetsを持つ投稿:', postedDrafts.length, '件\n');
  
  for (const draft of postedDrafts) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 タイトル:', draft.title);
    console.log('🆔 ID:', draft.id);
    console.log('📅 投稿日時:', draft.posted_at);
    console.log('\n📚 source_tweetsの完全な内容:');
    console.log(JSON.stringify(draft.source_tweets, null, 2));
    
    // URLを探す
    const sourceData = draft.source_tweets;
    if (sourceData.urls) {
      console.log('\n🔗 URLリスト:');
      sourceData.urls.forEach((url, i) => {
        console.log(`   ${i+1}. ${url}`);
        // URLが切れているかチェック
        if (!url.startsWith('https://')) {
          console.log('      ⚠️ URLが不完全です！');
        }
        if (url.length < 30) {
          console.log('      ⚠️ URLが短すぎます！');
        }
      });
    } else {
      console.log('\n⚠️ urlsフィールドが見つかりません');
    }
    
    // 他の可能なURLフィールドを探す
    const jsonStr = JSON.stringify(sourceData);
    const urlMatches = jsonStr.match(/https?:\/\/[^\s"]+/g);
    if (urlMatches) {
      console.log('\n🔍 JSON内で見つかったURL:');
      urlMatches.forEach((url, i) => {
        console.log(`   ${i+1}. ${url}`);
      });
    }
    
    console.log('\n');
  }
  
  await prisma.$disconnect();
}

checkSourceTweetsUrls().catch(console.error);