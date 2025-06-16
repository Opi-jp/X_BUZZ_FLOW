#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testSyncCoT() {
  console.log('🧪 同期版CoTシステムのテスト（既存のprocess APIを使用）\n');
  
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
    
    // 2. 通常のprocess APIを使用してフェーズを実行
    const phases = [
      { num: 1, steps: ['THINK', 'EXECUTE', 'INTEGRATE'] },
      { num: 2, steps: ['THINK', 'EXECUTE', 'INTEGRATE'] },
      { num: 3, steps: ['THINK', 'EXECUTE', 'INTEGRATE'] },
      { num: 4, steps: ['THINK', 'EXECUTE', 'INTEGRATE'] },
      { num: 5, steps: ['THINK', 'EXECUTE', 'INTEGRATE'] }
    ];
    
    let completed = false;
    let phaseIndex = 0;
    let stepIndex = 0;
    let iteration = 0;
    const maxIterations = 20;
    
    while (!completed && iteration < maxIterations) {
      const currentPhase = phases[phaseIndex];
      const currentStep = currentPhase.steps[stepIndex];
      
      console.log(`\n📍 Phase ${currentPhase.num} - ${currentStep} を実行...`);
      const startTime = Date.now();
      
      const processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const elapsed = Date.now() - startTime;
      
      if (!processResponse.ok) {
        const error = await processResponse.text();
        console.error(`❌ エラー:`, error);
        
        // リトライまたは中断
        if (error.includes('Execute result not found')) {
          console.log('⏱️ Execute結果を待機中...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        break;
      }
      
      const result = await processResponse.json();
      console.log(`✅ 完了 (${elapsed}ms)`);
      console.log(`  - 成功: ${result.success}`);
      console.log(`  - フェーズ完了: ${result.phaseCompleted || false}`);
      console.log(`  - 次のステップ: ${result.nextStep || 'なし'}`);
      
      // 進行状況を更新
      if (result.phaseCompleted) {
        console.log(`\n🎉 Phase ${currentPhase.num} 完了！`);
        if (result.nextPhase) {
          phaseIndex++;
          stepIndex = 0;
        } else {
          completed = true;
        }
      } else if (result.shouldContinue !== false) {
        stepIndex++;
        if (stepIndex >= currentPhase.steps.length) {
          console.log('⚠️  想定外の状態: ステップインデックスがオーバーフロー');
          break;
        }
      }
      
      // 完了チェック
      if (result.isCompleted || result.completed) {
        completed = true;
        console.log('\n✅ 全ての処理が完了しました！');
      }
      
      // 少し待機
      if (!completed && result.shouldContinue !== false) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      iteration++;
    }
    
    if (!completed && iteration >= maxIterations) {
      console.log('\n⏱️ タイムアウト: 最大イテレーション数に達しました');
    }
    
    // 3. 最終結果を確認
    console.log('\n3️⃣ 最終結果の確認...');
    const detailsResponse = await fetch(`${baseUrl}/api/debug/session-details/${sessionId}`);
    
    if (detailsResponse.ok) {
      const details = await detailsResponse.json();
      console.log('セッション最終状態:');
      console.log(`  - ID: ${details.sessionId}`);
      console.log(`  - 状態: ${details.status}`);
      console.log(`  - フェーズ: ${details.currentPhase}`);
      console.log(`  - ステップ: ${details.currentStep}`);
      
      if (details.phases) {
        console.log('\nフェーズごとの結果:');
        details.phases.forEach(phase => {
          console.log(`  Phase ${phase.number}:`);
          console.log(`    - 状態: ${phase.status}`);
          console.log(`    - THINK: ${phase.hasThinkResult ? '✅' : '❌'}`);
          console.log(`    - EXECUTE: ${phase.hasExecuteResult ? '✅' : '❌'}`);
          console.log(`    - INTEGRATE: ${phase.hasIntegrateResult ? '✅' : '❌'}`);
        });
      }
    }
    
    console.log('\n✅ テスト完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW 同期版CoTシステム テスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    console.log('💡 別のターミナルで以下を実行してください:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
  
  await testSyncCoT();
}

// 実行
main().catch(console.error);