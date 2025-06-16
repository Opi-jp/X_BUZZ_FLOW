#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testRecovery() {
  console.log('🧪 CoTセッション リカバリーテスト\n');
  
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
    
    const { sessionId } = await createResponse.json();
    console.log(`✅ セッション作成成功: ${sessionId}\n`);
    
    // 2. 健全性チェック
    console.log('2️⃣ セッションの健全性をチェック...');
    const healthResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/recover`);
    const healthData = await healthResponse.json();
    
    console.log('健全性チェック結果:');
    console.log(`  - 健全: ${healthData.health.isHealthy ? '✅' : '❌'}`);
    console.log(`  - 問題: ${healthData.health.issues.length === 0 ? 'なし' : healthData.health.issues.join(', ')}`);
    console.log(`  - 推奨: ${healthData.health.recommendations.join(', ') || 'なし'}\n`);
    
    // 3. エラーを意図的に発生させる（エラーシミュレーション）
    console.log('3️⃣ エラーをシミュレート...');
    
    // セッションを強制的にエラー状態に
    const { PrismaClient } = require('./app/generated/prisma');
    const prisma = new PrismaClient();
    
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        status: 'FAILED',
        lastError: 'Simulated timeout error',
        retryCount: 1
      }
    });
    
    console.log('✅ エラー状態を設定しました\n');
    
    // 4. リカバリーアクションをテスト
    console.log('4️⃣ リカバリーアクションをテスト...');
    
    // 健全性を再チェック
    const health2Response = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/recover`);
    const health2Data = await health2Response.json();
    
    console.log('エラー後の健全性:');
    console.log(`  - 健全: ${health2Data.health.isHealthy ? '✅' : '❌'}`);
    console.log(`  - 問題: ${health2Data.health.issues.join(', ')}`);
    console.log(`  - 推奨: ${health2Data.health.recommendations.join(', ')}\n`);
    
    // リトライを実行
    console.log('5️⃣ リトライを実行...');
    const retryResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'retry'
      })
    });
    
    const retryResult = await retryResponse.json();
    console.log('リトライ結果:', retryResult);
    
    // 6. processを再実行
    console.log('\n6️⃣ プロセスを再実行...');
    const processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!processResponse.ok) {
      const errorData = await processResponse.json();
      console.log('プロセスエラー:');
      console.log(`  - エラー: ${errorData.error}`);
      console.log(`  - リカバリーアクション: ${JSON.stringify(errorData.recoveryAction)}`);
      console.log(`  - メッセージ: ${errorData.message}`);
    } else {
      const processResult = await processResponse.json();
      console.log('✅ プロセス成功!');
    }
    
    // 7. フェーズ再開をテスト
    console.log('\n7️⃣ フェーズ再開をテスト...');
    
    // 複数回失敗させる
    await prisma.cotSession.update({
      where: { id: sessionId },
      data: {
        retryCount: 5,
        lastError: 'Multiple failures'
      }
    });
    
    const restartPhaseResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'restart_phase',
        phaseNumber: 1
      })
    });
    
    const restartResult = await restartPhaseResponse.json();
    console.log('フェーズ再開結果:', restartResult);
    
    // クリーンアップ
    await prisma.$disconnect();
    
    console.log('\n✅ リカバリーテスト完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW リカバリー機能テスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    process.exit(1);
  }
  
  await testRecovery();
}

// 実行
main().catch(console.error);