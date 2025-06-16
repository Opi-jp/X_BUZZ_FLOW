#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testCoTWithLogs() {
  console.log('🧪 CoTセッションをログ付きでテスト\n');
  
  const baseUrl = 'http://localhost:3000';
  const logFile = path.join(__dirname, 'cot-test.log');
  
  // ログファイルをクリア
  fs.writeFileSync(logFile, `CoT Test Log - ${new Date().toISOString()}\n\n`);
  
  const log = (message) => {
    console.log(message);
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
  };
  
  try {
    // 1. 新しいセッションを作成
    log('1️⃣ 新しいセッションを作成...');
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
    log(`✅ セッション作成成功: ${sessionId}\n`);
    
    // 2. 各ステップを順番に実行
    const steps = [
      { phase: 1, step: 'THINK' },
      { phase: 1, step: 'EXECUTE' },
      { phase: 1, step: 'INTEGRATE' }
    ];
    
    for (const { phase, step } of steps) {
      log(`\n📍 Phase ${phase} - ${step} を実行...`);
      const startTime = Date.now();
      
      const processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const duration = Date.now() - startTime;
      
      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        log(`❌ Phase ${phase} ${step} 失敗 (${duration}ms)`);
        
        try {
          const errorData = JSON.parse(errorText);
          log(`  - エラー: ${errorData.error}`);
          log(`  - タイプ: ${errorData.errorType || 'unknown'}`);
          log(`  - 詳細: ${errorData.details || 'なし'}`);
        } catch (e) {
          log(`  - レスポンス: ${errorText.substring(0, 200)}...`);
        }
        
        // セッション詳細を取得
        const detailsResponse = await fetch(`${baseUrl}/api/debug/session-details/${sessionId}`);
        if (detailsResponse.ok) {
          const details = await detailsResponse.json();
          log(`  - セッション状態: ${details.status}`);
          log(`  - 最後のエラー: ${details.lastError || 'なし'}`);
        }
        
        break; // エラーが発生したら停止
      }
      
      const result = await processResponse.json();
      log(`✅ Phase ${phase} ${step} 完了 (${duration}ms)`);
      log(`  - 成功: ${result.success}`);
      log(`  - 次のステップ: ${result.nextStep || 'なし'}`);
      
      if (step === 'EXECUTE' && result.result) {
        log(`  - 検索結果数: ${result.result.searchResults?.length || 0}`);
      }
      
      // 次のステップに進む前に少し待つ
      if (result.shouldContinue) {
        log(`  - 2秒待機...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 最終的なセッション状態を確認
    log('\n📊 最終的なセッション状態を確認...');
    const finalDetailsResponse = await fetch(`${baseUrl}/api/debug/session-details/${sessionId}`);
    
    if (finalDetailsResponse.ok) {
      const details = await finalDetailsResponse.json();
      log(`セッション最終状態:`);
      log(`  - ID: ${details.sessionId}`);
      log(`  - 状態: ${details.status}`);
      log(`  - フェーズ: ${details.currentPhase}`);
      log(`  - ステップ: ${details.currentStep}`);
      log(`  - エラー: ${details.lastError || 'なし'}`);
    }
    
    log(`\n✅ テスト完了！ログファイル: ${logFile}`);
    
  } catch (error) {
    log(`\n❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW CoTセッション ログ付きテスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    console.log('💡 別のターミナルで以下を実行してください:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
  
  await testCoTWithLogs();
}

// 実行
main().catch(console.error);