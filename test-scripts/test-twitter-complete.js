// Twitter API完全認証テスト
const { TwitterApi } = require('twitter-api-v2');

async function testCompleteTwitterPost() {
  console.log('=== Twitter API完全認証投稿テスト ===');
  
  // 完全な認証情報
  const credentials = {
    appKey: 'CYXHe62d5Yl0rlSmZezaw1SjP',
    appSecret: 'lkTMV179YR1OunMFxPLH1QLQWYpZWDmq4Cdi43rTdKuRhDFnRa',
    accessToken: '5209331-jsSdW58klCoWVA6cu7yVf1l0Q5AIXc9vff5KDn4gM5',
    accessSecret: 'Oc3NvZ4QqZg1u8QdVrv6KQfqrCuAQze3PxdUOdYpiN9rY'
  };
  
  console.log('認証情報:');
  console.log('✅ API Key:', credentials.appKey);
  console.log('✅ API Secret:', credentials.appSecret.substring(0, 10) + '...');
  console.log('✅ Access Token:', credentials.accessToken);
  console.log('✅ Access Secret:', credentials.accessSecret.substring(0, 10) + '...');
  
  try {
    // Twitter APIクライアント作成
    const client = new TwitterApi(credentials);
    
    console.log('\n🔍 認証テスト中...');
    
    // 認証確認（自分の情報を取得）
    const me = await client.v2.me();
    console.log('✅ 認証成功！');
    console.log(`📱 アカウント: @${me.data.username} (${me.data.name})`);
    
    // テストツイート
    const testTweet = `🧪 X_BUZZ_FLOW システムテスト

Chain of Thought実装のTwitter投稿機能が正常に動作しています。

${new Date().toLocaleString('ja-JP')}

#X_BUZZ_FLOW #テスト #AI_Chain_of_Thought`;
    
    console.log('\n📝 投稿準備中...');
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
    console.log('\n🚀 投稿実行中...');
    const tweet = await client.v2.tweet(testTweet);
    console.log('\n🎉 投稿成功！');
    console.log(`🔗 URL: https://twitter.com/${me.data.username}/status/${tweet.data.id}`);
    console.log(`📊 ツイートID: ${tweet.data.id}`);
    console.log(`📅 投稿日時: ${new Date().toISOString()}`);
    
    // 投稿結果をJSONで出力
    console.log('\n📋 投稿結果（JSON形式）:');
    console.log(JSON.stringify({
      success: true,
      id: tweet.data.id,
      text: tweet.data.text,
      url: `https://twitter.com/${me.data.username}/status/${tweet.data.id}`,
      username: me.data.username,
      timestamp: new Date().toISOString()
    }, null, 2));
    
  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error('エラーコード:', error.code);
    console.error('エラーメッセージ:', error.message);
    if (error.data) {
      console.error('詳細:', error.data);
    }
  }
}

testCompleteTwitterPost().catch(console.error);