#!/usr/bin/env node

/**
 * Source Tree実際のフォーマットテスト
 * 実際のセッションから出典情報を取得してフォーマット
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { formatSourceTweetFromSession } = require('./lib/twitter/source-formatter');
const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function testSourceTreeFormat() {
  console.log('🧪 Source Tree実際のフォーマットテスト\n');
  
  try {
    // 最新のセッションIDを使用
    const sessionId = 'sess_zcinUhEXlPSr';
    
    console.log(`📝 セッションID: ${sessionId}\n`);
    
    // formatSourceTweetFromSessionを直接呼び出し
    try {
      const result = await formatSourceTweetFromSession(sessionId);
      
      if (typeof result === 'string') {
        console.log('==== 単一の出典ツイート ====');
        console.log(result);
        console.log(`\n文字数: ${result.length}文字`);
        
        // URLが含まれているか確認
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = result.match(urlRegex) || [];
        console.log(`\n含まれるURL数: ${urls.length}`);
        urls.forEach((url, index) => {
          console.log(`  ${index + 1}. ${url}`);
        });
      } else if (Array.isArray(result)) {
        console.log(`==== 複数の出典ツイート (${result.length}件) ====\n`);
        
        result.forEach((tweet, index) => {
          console.log(`--- ツイート ${index + 1} ---`);
          console.log(tweet);
          console.log(`文字数: ${tweet.length}文字`);
          
          // URLが含まれているか確認
          const urlRegex = /https?:\/\/[^\s]+/g;
          const urls = tweet.match(urlRegex) || [];
          if (urls.length > 0) {
            console.log(`含まれるURL:`);
            urls.forEach((url, i) => {
              console.log(`  ${i + 1}. ${url}`);
            });
          }
          console.log('');
        });
      }
      
      // 各URLが切れていないか確認
      console.log('\n==== URL完全性チェック ====');
      const expectedUrls = [
        'https://www.dir.co.jp/report/column/20250619_012279.html',
        'https://news.mynavi.jp/techplus/article/20250618-3356360/'
      ];
      
      expectedUrls.forEach((expectedUrl, index) => {
        const resultText = Array.isArray(result) ? result.join('\n') : result;
        const found = resultText.includes(expectedUrl);
        console.log(`${index + 1}. ${expectedUrl}`);
        console.log(`   → ${found ? '✅ 完全に含まれている' : '❌ 見つからないか切れている'}`);
      });
      
    } catch (error) {
      console.error('❌ フォーマットエラー:', error.message);
      console.error(error.stack);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
testSourceTreeFormat();