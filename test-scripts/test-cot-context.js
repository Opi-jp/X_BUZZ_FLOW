#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testContextFlow() {
  console.log('🧪 CoTコンテキストフローのテスト開始\n');
  
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
        expertise: 'テスト分野',
        style: 'テストスタイル',
        platform: 'Twitter'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`セッション作成失敗: ${createResponse.status}`);
    }
    
    const { sessionId } = await createResponse.json();
    console.log(`✅ セッション作成成功: ${sessionId}\n`);
    
    // 2. セッションの詳細を確認（作成直後）
    console.log('2️⃣ セッションの詳細を確認（作成直後）...');
    const detailsResponse1 = await fetch(`${baseUrl}/api/debug/session-details/${sessionId}`);
    
    if (detailsResponse1.ok) {
      const details = await detailsResponse1.json();
      console.log('セッション詳細:');
      console.log(`  - expertise: ${details.expertise}`);
      console.log(`  - style: ${details.style}`);
      console.log(`  - platform: ${details.platform}`);
      console.log(`  - 状態: ${details.status}`);
      console.log(`  - フェーズ: ${details.currentPhase}`);
      console.log(`  - ステップ: ${details.currentStep}\n`);
    }
    
    // 3. buildContextの動作を確認するAPIを作成
    console.log('3️⃣ buildContextの動作をテスト...');
    const contextTestResponse = await fetch(`${baseUrl}/api/debug/test-context/${sessionId}`, {
      method: 'GET'
    });
    
    if (contextTestResponse.ok) {
      const contextData = await contextTestResponse.json();
      console.log('buildContext結果:');
      console.log(`  - hasContext: ${!!contextData.context}`);
      console.log(`  - contextKeys: ${contextData.contextKeys?.join(', ')}`);
      console.log(`  - expertise: ${contextData.context?.expertise}`);
      console.log(`  - userConfig: ${JSON.stringify(contextData.context?.userConfig)}\n`);
    }
    
    // 4. Phase 1 THINKを実行（モック版）
    console.log('4️⃣ Phase 1 THINK を実行（モック版）...');
    const mockThinkResponse = await fetch(`${baseUrl}/api/debug/mock-think/${sessionId}`, {
      method: 'POST'
    });
    
    if (mockThinkResponse.ok) {
      const thinkResult = await mockThinkResponse.json();
      console.log('✅ THINK完了（モック）\n');
    }
    
    // 5. Phase 1 EXECUTEを実行（モック版）
    console.log('5️⃣ Phase 1 EXECUTE を実行（モック版）...');
    const mockExecuteResponse = await fetch(`${baseUrl}/api/debug/mock-execute/${sessionId}`, {
      method: 'POST'
    });
    
    if (mockExecuteResponse.ok) {
      const executeResult = await mockExecuteResponse.json();
      console.log('✅ EXECUTE完了（モック）');
      console.log(`  - context.expertise: ${executeResult.receivedExpertise}`);
      console.log(`  - context.userConfig: ${JSON.stringify(executeResult.receivedUserConfig)}\n`);
    } else {
      const error = await mockExecuteResponse.text();
      console.error('❌ EXECUTE失敗:', error);
    }
    
    console.log('\n✅ テスト完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW コンテキストフロー ローカルテスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    console.log('💡 別のターミナルで以下を実行してください:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
  
  await testContextFlow();
}

// 実行
main().catch(console.error);