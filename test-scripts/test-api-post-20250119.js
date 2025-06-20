#!/usr/bin/env node

/**
 * /api/post エンドポイントのテストスクリプト
 * Twitter投稿機能の動作確認
 */

const fetch = require('node-fetch');

async function testPostEndpoint() {
  console.log('🐦 Testing /api/post endpoint...\n');

  const testCases = [
    {
      name: 'Test 1: Simple text post',
      payload: {
        text: `テスト投稿 - /api/post endpoint test at ${new Date().toLocaleString('ja-JP')}`
      }
    },
    {
      name: 'Test 2: Post with hashtags',
      payload: {
        text: `APIエンドポイントのテスト🚀\n\n新しい/api/postエンドポイントが正常に動作しています！\n\n#テスト #API #開発 ${new Date().toLocaleString('ja-JP')}`
      }
    },
    {
      name: 'Test 3: Missing text (should fail)',
      payload: {},
      expectError: true
    }
  ];

  // 環境変数の確認
  console.log('📋 Environment check:');
  const envVars = ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'];
  let allEnvSet = true;
  for (const envVar of envVars) {
    const isSet = !!process.env[envVar];
    console.log(`  ${isSet ? '✅' : '❌'} ${envVar}: ${isSet ? 'Set' : 'Not set'}`);
    if (!isSet) allEnvSet = false;
  }
  console.log();

  if (!allEnvSet) {
    console.error('⚠️  Warning: Some environment variables are not set. API calls may fail.');
    console.log('💡 Make sure to set all required environment variables in .env.local\n');
  }

  // モックモードの確認
  const isMockMode = process.env.USE_MOCK_POSTING === 'true';
  if (isMockMode) {
    console.log('🎭 Running in MOCK MODE (USE_MOCK_POSTING=true)\n');
  }

  // 各テストケースを実行
  for (const test of testCases) {
    console.log(`📝 ${test.name}`);
    console.log(`   Payload: ${JSON.stringify(test.payload)}`);

    try {
      const response = await fetch('http://localhost:3000/api/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (test.expectError) {
          console.log(`   ❌ Expected error but got success: ${JSON.stringify(data)}`);
        } else {
          console.log(`   ✅ Success!`);
          console.log(`   Tweet ID: ${data.id}`);
          console.log(`   URL: ${data.url}`);
          if (data.mock) {
            console.log(`   🎭 Mock post created`);
          }
        }
      } else {
        if (test.expectError) {
          console.log(`   ✅ Expected error: ${data.error}`);
        } else {
          console.log(`   ❌ Error: ${data.error}`);
          if (data.details) {
            console.log(`   Details: ${JSON.stringify(data.details, null, 2)}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }

    console.log();
  }

  // 使い方のヒント
  console.log('\n💡 Tips:');
  console.log('- To test with real Twitter posting: Make sure all TWITTER_* env vars are set');
  console.log('- To test in mock mode: Set USE_MOCK_POSTING=true');
  console.log('- Check server logs for detailed error information');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// メイン実行
testPostEndpoint().catch(console.error);