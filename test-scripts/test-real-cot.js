#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testRealCoT() {
  console.log('🧪 実際のCoTセッションをテスト（Perplexityはスキップ）\n');
  
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
    
    if (!createResponse.ok) {
      throw new Error(`セッション作成失敗: ${createResponse.status}`);
    }
    
    const { sessionId } = await createResponse.json();
    console.log(`✅ セッション作成成功: ${sessionId}\n`);
    
    // 2. Phase 1 - THINK
    console.log('2️⃣ Phase 1 - THINK を実行...');
    const processResponse1 = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!processResponse1.ok) {
      const error = await processResponse1.text();
      throw new Error(`Phase 1 THINK 失敗: ${error}`);
    }
    
    const result1 = await processResponse1.json();
    console.log(`✅ Phase 1 THINK 完了`);
    console.log(`  - 実行時間: ${result1.duration}ms`);
    console.log(`  - 次のステップ: ${result1.nextStep}\n`);
    
    // 3. Phase 1 - EXECUTE を実行（エラーが出るはず）
    console.log('3️⃣ Phase 1 - EXECUTE を実行...');
    console.log('⚠️  エラーが発生することを期待しています（context問題の確認）\n');
    
    const processResponse2 = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!processResponse2.ok) {
      const errorText = await processResponse2.text();
      console.log('⚠️  想定通りエラーが発生:');
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
        console.log(`  - エラーメッセージ: ${errorData.error}`);
        console.log(`  - エラータイプ: ${errorData.errorType || 'unknown'}`);
        console.log(`  - 詳細: ${errorData.details || 'なし'}`);
      } catch (e) {
        console.log(`  - レスポンス: ${errorText.substring(0, 200)}...`);
      }
      
      // エラーログを確認
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // セッション詳細を確認
      console.log('\n4️⃣ セッション詳細を確認...');
      const detailsResponse = await fetch(`${baseUrl}/api/debug/session-details/${sessionId}`);
      
      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        console.log('セッション詳細:');
        console.log(`  - 状態: ${details.status}`);
        console.log(`  - 最後のエラー: ${details.lastError || 'なし'}`);
        console.log(`  - リトライ回数: ${details.retryCount}`);
      }
      
    } else {
      const result2 = await processResponse2.json();
      console.log(`✅ Phase 1 EXECUTE 成功（問題が修正された！）`);
      console.log(`  - 実行時間: ${result2.duration}ms`);
      console.log(`  - 検索結果数: ${result2.result?.searchResults?.length || 0}`);
    }
    
    console.log('\n✅ テスト完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW 実CoTセッション テスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    console.log('💡 別のターミナルで以下を実行してください:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
  
  await testRealCoT();
}

// 実行
main().catch(console.error);