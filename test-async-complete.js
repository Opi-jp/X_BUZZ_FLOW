#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testAsyncComplete() {
  console.log('🧪 非同期CoTシステムの完全テスト\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // 0. ワーカーの状態を確認
    console.log('0️⃣ ワーカープロセスを確認...');
    const workerRunning = await checkWorkerStatus();
    if (!workerRunning) {
      console.log('⚠️  ワーカーが起動していません');
      console.log('💡 別のターミナルで以下を実行してください:');
      console.log('   node scripts/async-worker.js\n');
      console.log('または:');
      console.log('   npm run worker\n');
    }
    
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
    console.log('初回タスク情報:', {
      taskId: processResult.taskId,
      status: processResult.status,
      message: processResult.message
    });
    console.log();
    
    // 3. 進捗を監視（簡易版）
    console.log('3️⃣ 処理状況を監視（簡易版）...\n');
    
    let completed = false;
    let previousPhase = 1;
    let previousStep = 'THINK';
    let checkCount = 0;
    const maxChecks = 30; // 最大30回チェック（5分）
    
    while (!completed && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待機
      
      // ステータスを確認
      const statusResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/async-status`);
      const status = await statusResponse.json();
      
      // 変化があった場合のみ表示
      if (status.session.currentPhase !== previousPhase || status.session.currentStep !== previousStep) {
        console.log(`[${new Date().toLocaleTimeString()}] 進捗更新:`);
        console.log(`  Phase ${previousPhase} ${previousStep} → Phase ${status.session.currentPhase} ${status.session.currentStep}`);
        previousPhase = status.session.currentPhase;
        previousStep = status.session.currentStep;
      }
      
      // タスク状況のサマリー
      const tasks = status.asyncTasks.summary;
      console.log(`  タスク: 完了 ${tasks.completed} / 処理中 ${tasks.processing} / キュー ${tasks.queued} / 失敗 ${tasks.failed}`);
      console.log(`  全体進捗: ${status.progress.percentage}%\n`);
      
      // 次のアクションを実行
      if (status.nextAction.action === 'continue' && tasks.processing === 0 && tasks.queued === 0) {
        console.log('📍 次のステップを実行...');
        const continueResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process-async`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (continueResponse.ok) {
          const result = await continueResponse.json();
          if (result.taskId || result.taskIds) {
            console.log(`新しいタスクを開始しました\n`);
          }
        }
      }
      
      // 完了チェック
      if (status.session.status === 'COMPLETED') {
        completed = true;
        console.log('🎉 全ての処理が完了しました！');
      } else if (status.session.status === 'FAILED') {
        console.error('❌ 処理が失敗しました');
        break;
      }
      
      checkCount++;
    }
    
    if (!completed && checkCount >= maxChecks) {
      console.log('⏱️ タイムアウト: 5分以上経過しました');
    }
    
    // 4. 最終結果を表示
    console.log('\n4️⃣ 最終結果の確認...');
    const finalStatusResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/async-status`);
    const finalStatus = await finalStatusResponse.json();
    
    console.log('\nセッション最終状態:');
    console.log(`  - ID: ${finalStatus.session.id}`);
    console.log(`  - 状態: ${finalStatus.session.status}`);
    console.log(`  - 完了フェーズ: ${finalStatus.progress.completedPhases}/5`);
    
    // タスクのサマリー
    const totalTasks = finalStatus.asyncTasks.summary;
    console.log('\nタスク実行統計:');
    console.log(`  - 総タスク数: ${totalTasks.total}`);
    console.log(`  - 成功: ${totalTasks.completed}`);
    console.log(`  - 失敗: ${totalTasks.failed}`);
    
    // フェーズごとの結果
    console.log('\nフェーズごとの結果:');
    finalStatus.phases.forEach(phase => {
      console.log(`  Phase ${phase.number}: ${phase.status}`);
      const checks = [];
      if (phase.hasThink) checks.push('Think ✅');
      if (phase.hasExecute) checks.push('Execute ✅');
      if (phase.hasIntegrate) checks.push('Integrate ✅');
      if (checks.length > 0) {
        console.log(`    完了: ${checks.join(', ')}`);
      }
    });
    
    // 生成された下書きを確認
    if (finalStatus.session.status === 'COMPLETED') {
      console.log('\n5️⃣ 生成された下書きを確認...');
      try {
        const { PrismaClient } = require('./app/generated/prisma');
        const prisma = new PrismaClient();
        
        const drafts = await prisma.cotDraft.findMany({
          where: { sessionId },
          orderBy: { conceptNumber: 'asc' }
        });
        
        console.log(`\n✅ ${drafts.length}件の下書きが生成されました:`);
        drafts.forEach((draft, i) => {
          console.log(`\n下書き${i + 1}: ${draft.title}`);
          console.log(`  フック: ${draft.hook}`);
          console.log(`  形式: ${draft.format}`);
          if (draft.content) {
            console.log(`  内容: ${draft.content.substring(0, 100)}...`);
          }
        });
        
        await prisma.$disconnect();
      } catch (e) {
        console.log('下書きの取得に失敗しました:', e.message);
      }
    }
    
    console.log('\n✅ テスト完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// ワーカーの状態を確認
async function checkWorkerStatus() {
  try {
    const { PrismaClient } = require('./app/generated/prisma');
    const prisma = new PrismaClient();
    
    // 最近のタスクをチェック
    const recentTasks = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM api_tasks 
      WHERE completed_at > NOW() - INTERVAL '1 minute'
    `;
    
    await prisma.$disconnect();
    
    return Number(recentTasks[0].count) > 0;
  } catch (e) {
    return false;
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW 非同期CoTシステム 完全テスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    console.log('💡 別のターミナルで以下を実行してください:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
  
  await testAsyncComplete();
}

// 実行
main().catch(console.error);