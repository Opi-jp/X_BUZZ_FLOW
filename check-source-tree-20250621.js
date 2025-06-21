#!/usr/bin/env node

/**
 * 投稿済みドラフトのSource Tree情報を詳細確認
 * URLが切れている問題を特定
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function checkSourceTree() {
  console.log('🔍 Source Tree詳細確認\n');
  
  try {
    // 最新の投稿済みドラフトを取得
    const drafts = await prisma.viral_drafts.findMany({
      where: {
        status: 'POSTED',
        source_tweets: { not: null }
      },
      orderBy: { posted_at: 'desc' },
      take: 3,
      include: {
        viral_sessions: {
          select: {
            topics: true
          }
        }
      }
    });
    
    console.log(`📊 ${drafts.length}件の投稿済みドラフトを確認\n`);
    
    for (const draft of drafts) {
      console.log('━'.repeat(60));
      console.log(`📝 タイトル: ${draft.title}`);
      console.log(`🆔 ID: ${draft.id}`);
      console.log(`📅 投稿日時: ${draft.posted_at}`);
      
      // source_tweetsの詳細を確認
      const sourceTweets = draft.source_tweets;
      console.log(`\n📚 Source Tweets構造:`);
      console.log(`- format: ${sourceTweets.format}`);
      console.log(`- tweetCount: ${sourceTweets.tweetCount}`);
      console.log(`- posts数: ${sourceTweets.posts?.length || 0}`);
      
      // Source Treeのpostを探す
      const sourcePosts = sourceTweets.posts?.filter(post => post.type === 'source') || [];
      console.log(`\n🔗 Source Tree投稿: ${sourcePosts.length}件`);
      
      sourcePosts.forEach((post, index) => {
        console.log(`\n--- Source ${index + 1} ---`);
        console.log(`Position: ${post.position}`);
        console.log(`Tweet ID: ${post.tweetId}`);
        console.log(`\nContent (全文):`);
        console.log('─'.repeat(40));
        console.log(post.content);
        console.log('─'.repeat(40));
        
        // URLを抽出して確認
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = post.content.match(urlRegex) || [];
        console.log(`\n抽出されたURL: ${urls.length}件`);
        urls.forEach((url, i) => {
          console.log(`  ${i + 1}. ${url}`);
          // URLが完全か確認
          const isComplete = url.includes('.html') || url.includes('.htm') || url.endsWith('/');
          console.log(`     → ${isComplete ? '✅ 完全' : '⚠️ 切れている可能性'}`);
        });
      });
      
      // 元のtopicsデータと比較
      if (draft.viral_sessions?.topics) {
        console.log(`\n📊 元のTopicsデータとの比較:`);
        try {
          const topicsText = typeof draft.viral_sessions.topics === 'string' 
            ? draft.viral_sessions.topics 
            : JSON.stringify(draft.viral_sessions.topics);
          const topicsData = JSON.parse(topicsText);
          
          if (topicsData.topics && Array.isArray(topicsData.topics)) {
            console.log(`元の出典数: ${topicsData.topics.length}件`);
            topicsData.topics.forEach((topic, i) => {
              console.log(`  ${i + 1}. ${topic.url}`);
            });
          }
        } catch (e) {
          console.log('  → topicsデータのパースエラー');
        }
      }
      
      console.log('\n');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
checkSourceTree();