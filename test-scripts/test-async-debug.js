#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testAsyncDebug() {
  console.log('🧪 非同期CoTシステムのデバッグテスト\n');
  
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
    
    // 2. 最初のタスクを開始（Phase 1 - THINK）
    console.log('2️⃣ Phase 1 - THINK を非同期で開始...');
    const processResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!processResponse.ok) {
      const error = await processResponse.text();
      throw new Error(`Process失敗: ${error}`);
    }
    
    const processResult = await processResponse.json();
    console.log('Process結果:', processResult);
    
    // 3. タスクが完了するまで待つ
    console.log('\n3️⃣ タスク完了を待機...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
    
    // 4. Continue-asyncを手動でトリガー
    console.log('\n4️⃣ Continue-asyncを手動でトリガー...');
    const continueResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/continue-async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId: processResult.taskId })
    });
    
    const continueResult = await continueResponse.json();
    console.log('Continue結果:', continueResult);
    
    // 5. セッション状態を確認
    console.log('\n5️⃣ セッション状態を確認...');
    const statusResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/async-status`);
    const status = await statusResponse.json();
    console.log('セッション状態:', {
      status: status.session?.status,
      currentPhase: status.session?.currentPhase,
      currentStep: status.session?.currentStep
    });
    
    // 6. フェーズを確認
    const { PrismaClient } = require('./app/generated/prisma');
    const prisma = new PrismaClient();
    
    const phases = await prisma.cotPhase.findMany({
      where: { sessionId }
    });
    
    console.log('\nフェーズ数:', phases.length);
    if (phases.length > 0) {
      phases.forEach(p => {
        console.log(`  Phase ${p.phaseNumber}: ${p.status}`);
      });
    }
    
    await prisma.$disconnect();
    
    console.log('\n✅ デバッグ完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 実行
testAsyncDebug().catch(console.error);