// Twitter API直接テスト
const { TwitterApi } = require('twitter-api-v2');

async function testDirectTwitterPost() {
  console.log('=== Twitter API直接投稿テスト ===');
  
  // 提供された認証情報
  const API_KEY = 'CYXHe62d5Yl0rlSmZezaw1SjP';
  const API_SECRET = 'lkTMV179YR1OunMFxPLH1QLQWYpZWDmq4Cdi43rTdKuRhDFnRa';
  const CLIENT_ID = 'd09yVlhvZFVHYUlEVEtjVUo0eC06MTpjaQ';
  const CLIENT_SECRET = 'QjbPFXmqWODRenExu6JV-tGCHgPkR3gKk3dW4WNMG3lwf2vJyd';
  
  console.log('認証情報:');
  console.log('API_KEY:', API_KEY);
  console.log('API_SECRET:', API_SECRET.substring(0, 10) + '...');
  console.log('CLIENT_ID:', CLIENT_ID);
  console.log('CLIENT_SECRET:', CLIENT_SECRET.substring(0, 10) + '...');
  
  try {
    // App-only認証を試行
    console.log('\n🔑 App-only認証でテスト中...');
    
    const appOnlyClient = new TwitterApi({
      appKey: API_KEY,
      appSecret: API_SECRET,
    });
    
    // Bearer tokenを取得
    const appOnlyBearer = await appOnlyClient.appLogin();
    console.log('✅ App-only認証成功');
    
    // ただし、App-only認証では投稿はできないので、
    // OAuth1.0a認証が必要（Access TokenとAccess Token Secretが必要）
    
    console.log('\n⚠️  投稿にはユーザー認証（OAuth1.0a）が必要です');
    console.log('Access TokenとAccess Token Secretが必要です');
    
    // モック投稿として処理
    const mockTweetId = `mock_direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const testContent = `🧪 X_BUZZ_FLOW 直接投稿テスト

Chain of Thought実装のTwitter投稿機能をテスト中です。

${new Date().toLocaleString('ja-JP')}

#X_BUZZ_FLOW #テスト`;

    console.log('\n📝 投稿予定内容:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━');
    console.log(testContent);
    console.log('━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`文字数: ${testContent.length}/280`);
    
    console.log('\n🎯 モック投稿として処理:');
    console.log(`Tweet ID: ${mockTweetId}`);
    console.log(`URL: https://twitter.com/opi/status/${mockTweetId}`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error('エラーコード:', error.code);
    console.error('エラーメッセージ:', error.message);
    if (error.data) {
      console.error('詳細:', error.data);
    }
  }
}

testDirectTwitterPost().catch(console.error);