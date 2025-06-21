#!/usr/bin/env node

const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function checkLatestPosts() {
  console.log('🔍 最新の投稿を確認...\n');
  
  // 最新の投稿済みドラフトを取得
  const postedDrafts = await prisma.viral_drafts.findMany({
    where: { 
      status: 'POSTED',
      posted_at: { not: null }
    },
    orderBy: { posted_at: 'desc' },
    take: 5,
    include: {
      viral_sessions: {
        select: {
          theme: true
        }
      }
    }
  });
  
  console.log('📊 最新の投稿:', postedDrafts.length, '件\n');
  
  for (const draft of postedDrafts) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 タイトル:', draft.title);
    console.log('🆔 ID:', draft.id);
    console.log('📅 投稿日時:', draft.posted_at);
    console.log('🐦 Tweet ID:', draft.tweet_id);
    console.log('🏷️ ハッシュタグ:', draft.hashtags?.join(', '));
    
    // thread_structureを確認
    if (draft.thread_structure) {
      const threadData = draft.thread_structure;
      console.log('🧵 フォーマット:', threadData.type);
      console.log('📊 投稿数:', threadData.count || 0);
      if (threadData.postedIds) {
        console.log('🔗 投稿されたツイートID:', threadData.postedIds.length, '個');
        threadData.postedIds.forEach((id, i) => {
          console.log('   ', (i+1) + '.', id);
        });
      }
    } else {
      console.log('📄 フォーマット: single');
    }
    
    // source_tweetsを確認
    if (draft.source_tweets) {
      const sourceData = draft.source_tweets;
      console.log('📚 Source情報:');
      console.log('   - format:', sourceData.format);
      console.log('   - tweetCount:', sourceData.tweetCount);
      console.log('   - mainTweetId:', sourceData.mainTweetId);
      if (sourceData.threadIds) {
        console.log('   - 全ツイートID数:', sourceData.threadIds.length);
      }
    }
    
    console.log('');
  }
  
  await prisma.$disconnect();
}

checkLatestPosts().catch(console.error);