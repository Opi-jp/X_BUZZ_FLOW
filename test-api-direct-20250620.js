// Twitter API直接テスト
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { TwitterApi } = require('twitter-api-v2');

async function testDirectAPI() {
  console.log('🔍 Twitter API直接テスト\n');
  
  // 環境変数確認
  console.log('環境変数チェック:');
  console.log('API Key:', process.env.TWITTER_API_KEY ? '✓' : '✗');
  console.log('API Secret:', process.env.TWITTER_API_SECRET ? '✓' : '✗');
  console.log('Access Token:', process.env.TWITTER_ACCESS_TOKEN ? '✓' : '✗');
  console.log('Access Secret:', process.env.TWITTER_ACCESS_SECRET ? '✓' : '✗');
  
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
      !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
    console.error('\n❌ Twitter API認証情報が不足しています');
    return;
  }
  
  try {
    // クライアント作成
    console.log('\n1. TwitterApiクライアント作成...');
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
    console.log('✓ クライアント作成完了');
    
    // readWriteクライアント取得
    console.log('\n2. readWriteクライアント取得...');
    const rwClient = client.readWrite;
    console.log('✓ readWriteクライアント取得完了');
    console.log('rwClient:', typeof rwClient);
    console.log('rwClient.v2:', typeof rwClient.v2);
    console.log('rwClient.v2.tweet:', typeof rwClient.v2.tweet);
    
    // ツイート投稿
    const timestamp = new Date().toISOString();
    const text = `テスト投稿 [${timestamp}] #テスト`;
    
    console.log('\n3. ツイート投稿実行...');
    console.log('投稿内容:', text);
    
    const result = await rwClient.v2.tweet(text);
    
    console.log('\n✅ 投稿成功!');
    console.log('レスポンス:', JSON.stringify(result, null, 2));
    console.log('\ndata構造:');
    console.log('- id:', result.data?.id);
    console.log('- text:', result.data?.text);
    console.log('- author_id:', result.data?.author_id);
    console.log('- created_at:', result.data?.created_at);
    
    // DB更新のテスト
    console.log('\n4. DB更新テスト...');
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    
    try {
      // テスト用の下書きを作成
      const testDraft = await prisma.viral_drafts.create({
        data: {
          id: 'draft_test_' + Date.now(),
          session_id: 'sess_test',
          concept_id: 'conc_test',
          title: 'テスト下書き',
          content: JSON.stringify({ format: 'single', text: text }),
          hashtags: ['テスト'],
          status: 'DRAFT',
          character_id: 'test'
        }
      });
      console.log('テスト下書き作成:', testDraft.id);
      
      // DB更新
      const updated = await prisma.viral_drafts.update({
        where: { id: testDraft.id },
        data: {
          status: 'POSTED',
          tweet_id: result.data.id,
          posted_at: new Date()
        }
      });
      console.log('✓ DB更新成功:', updated.id);
      console.log('- status:', updated.status);
      console.log('- tweet_id:', updated.tweet_id);
      console.log('- posted_at:', updated.posted_at);
      
      // クリーンアップ
      await prisma.viral_drafts.delete({
        where: { id: testDraft.id }
      });
      console.log('✓ テストデータ削除完了');
      
    } finally {
      await prisma.$disconnect();
    }
    
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error('エラータイプ:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    console.error('スタックトレース:', error.stack);
    
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    if (error.data) {
      console.error('エラーデータ:', JSON.stringify(error.data, null, 2));
    }
  }
}

testDirectAPI();