// Twitter API認証テスト
require('dotenv').config({ path: '.env.local' });
const { TwitterApi } = require('twitter-api-v2');

async function testTwitterAuth() {
  console.log('=== Twitter API認証テスト ===');
  
  // 環境変数の確認
  console.log('環境変数チェック:');
  console.log('TWITTER_API_KEY:', process.env.TWITTER_API_KEY ? `${process.env.TWITTER_API_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('TWITTER_API_SECRET:', process.env.TWITTER_API_SECRET ? `${process.env.TWITTER_API_SECRET.substring(0, 10)}...` : 'NOT SET');
  console.log('TWITTER_ACCESS_TOKEN:', process.env.TWITTER_ACCESS_TOKEN ? `${process.env.TWITTER_ACCESS_TOKEN.substring(0, 15)}...` : 'NOT SET');
  console.log('TWITTER_ACCESS_SECRET:', process.env.TWITTER_ACCESS_SECRET ? `${process.env.TWITTER_ACCESS_SECRET.substring(0, 10)}...` : 'NOT SET');
  
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || 
      !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
    console.error('❌ Twitter API認証情報が不足しています');
    return;
  }
  
  try {
    // Twitter APIクライアント作成
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
    
    console.log('\n🔍 認証テスト中...');
    
    // 認証確認（自分の情報を取得）
    const me = await client.v2.me();
    console.log('✅ 認証成功！');
    console.log(`📱 アカウント: @${me.data.username} (${me.data.name})`);
    
    // テストツイート
    const testTweet = `🧪 X_BUZZ_FLOW システムテスト

Chain of Thought実装のTwitter投稿機能をテスト中です。

${new Date().toLocaleString('ja-JP')}

#X_BUZZ_FLOW #テスト`;
    
    console.log('\n📝 テスト投稿準備中...');
    console.log('投稿内容:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━');
    console.log(testTweet);
    console.log('━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`文字数: ${testTweet.length}/280`);
    
    if (testTweet.length > 280) {
      console.error('❌ 文字数制限オーバー');
      return;
    }
    
    // 実際に投稿
    const tweet = await client.v2.tweet(testTweet);
    console.log('\n🎉 投稿成功！');
    console.log(`🔗 URL: https://twitter.com/${me.data.username}/status/${tweet.data.id}`);
    console.log(`📊 ツイートID: ${tweet.data.id}`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error('エラーコード:', error.code);
    console.error('エラーメッセージ:', error.message);
    if (error.data) {
      console.error('詳細:', error.data);
    }
  }
}

testTwitterAuth().catch(console.error);