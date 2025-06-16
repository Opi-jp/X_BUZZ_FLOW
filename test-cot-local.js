#\!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testCoTSession() {
  console.log('🧪 CoTセッションのローカルテスト開始\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // 1. 新しいセッションを作成
    console.log('1️⃣ 新しいセッションを作成...');
    const createResponse = await fetch(`${baseUrl}/api/viral/cot-session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expertise: 'AIと働き方',
        style: '洞察的',
        platform: 'Twitter'
      })
    });
    
    if (\!createResponse.ok) {
      throw new Error(`セッション作成失敗: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const { sessionId } = await createResponse.json();
    console.log(`✅ セッション作成成功: ${sessionId}\n`);
    
    // 2. セッションを処理（Phase 1 - THINK）
    console.log('2️⃣ Phase 1 - THINK を実行...');
    const processResponse1 = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (\!processResponse1.ok) {
      const error = await processResponse1.text();
      throw new Error(`Phase 1 THINK 失敗: ${error}`);
    }
    
    const result1 = await processResponse1.json();
    console.log(`✅ Phase 1 THINK 完了: ${result1.duration}ms\n`);
    
    // 3. Phase 1 - EXECUTE を実行
    console.log('3️⃣ Phase 1 - EXECUTE を実行...');
    const processResponse2 = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (\!processResponse2.ok) {
      const error = await processResponse2.text();
      console.error('❌ Phase 1 EXECUTE エラーレスポンス:');
      console.error(error);
      throw new Error(`Phase 1 EXECUTE 失敗`);
    }
    
    const result2 = await processResponse2.json();
    console.log(`✅ Phase 1 EXECUTE 完了: ${result2.duration}ms\n`);
    
    // 4. セッションの詳細を確認
    console.log('4️⃣ セッションの詳細を確認...');
    const detailsResponse = await fetch(`${baseUrl}/api/debug/session-details/${sessionId}`);
    
    if (detailsResponse.ok) {
      const details = await detailsResponse.json();
      console.log('セッション詳細:');
      console.log(`  - 状態: ${details.status}`);
      console.log(`  - 現在のフェーズ: ${details.currentPhase}`);
      console.log(`  - 現在のステップ: ${details.currentStep}`);
      console.log(`  - エラー: ${details.lastError || 'なし'}`);
      console.log(`  - expertise: ${details.expertise}`);
    }
    
    console.log('\n✅ テスト完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW CoTセッション ローカルテスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (\!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    console.log('💡 別のターミナルで以下を実行してください:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
  
  await testCoTSession();
}

// 実行
main().catch(console.error);
EOF < /dev/null