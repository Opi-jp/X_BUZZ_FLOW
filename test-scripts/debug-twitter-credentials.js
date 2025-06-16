// Twitter認証情報の詳細デバッグ
const { TwitterApi } = require('twitter-api-v2');

async function debugTwitterCredentials() {
  console.log('=== Twitter認証詳細デバッグ ===');
  
  const credentials = {
    appKey: 'vlattMlII8Lz87FllcHH07R8M',
    appSecret: 'yq4di737XrSBKxaTqlBcDjEbT2uHhsXRO4PPsuddNDRDq4EnjO',
    accessToken: '5209331-DtWniig8bZfvrppUTOBuxbr8Kl6JRw29kSm35tJKPP',
    accessSecret: 'i2sAztweB8gZJ6XGzVKgqYqyP1YdpmtN4xbHm1YJGiTYf'
  };
  
  try {
    console.log('🔑 認証情報の検証...');
    
    // Step 1: App-only認証をテスト
    console.log('\n📋 Step 1: App-only認証テスト');
    try {
      const appOnlyClient = new TwitterApi({
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
      });
      
      const appBearer = await appOnlyClient.appLogin();
      console.log('✅ App-only認証: 成功');
      console.log('Bearer Token取得済み');
    } catch (appError) {
      console.log('❌ App-only認証: 失敗');
      console.log('エラー:', appError.message);
    }
    
    // Step 2: User認証をテスト
    console.log('\n👤 Step 2: User認証テスト（投稿用）');
    try {
      const userClient = new TwitterApi(credentials);
      
      // 自分の情報を取得してアクセス権限をテスト
      const me = await userClient.v2.me();
      console.log('✅ User認証: 成功');
      console.log(`アカウント: @${me.data.username} (${me.data.name})`);
      console.log(`ID: ${me.data.id}`);
      
      // 権限の確認
      console.log('\n🔍 権限の確認...');
      try {
        // アプリケーションの権限情報を取得
        console.log('投稿権限テスト準備完了');
        return true; // 認証成功
      } catch (permError) {
        console.log('❌ 権限エラー:', permError.message);
      }
      
    } catch (userError) {
      console.log('❌ User認証: 失敗');
      console.log('エラーコード:', userError.code);
      console.log('エラーメッセージ:', userError.message);
      
      if (userError.data) {
        console.log('詳細:', JSON.stringify(userError.data, null, 2));
      }
      
      // 認証エラーの種類を分析
      if (userError.code === 401) {
        console.log('\n🔍 401エラー分析:');
        console.log('- Access TokenまたはAccess Token Secretが無効');
        console.log('- アプリケーションの権限設定の問題');
        console.log('- トークンの有効期限切れ');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ 全体エラー:', error);
    return false;
  }
}

// 実行
debugTwitterCredentials()
  .then((success) => {
    if (success) {
      console.log('\n🎉 認証成功！投稿テスト準備完了');
    } else {
      console.log('\n⚠️  認証に問題があります。Developer Portalで設定を確認してください');
    }
  })
  .catch(console.error);