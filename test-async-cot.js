#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testAsyncCoT() {
  console.log('🧪 非同期CoTシステムのテスト\n');
  
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
    
    // 2. 非同期処理を開始（Phase 1 - THINK）
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
    console.log('レスポンス:', {
      success: processResult.success,
      taskId: processResult.taskId,
      status: processResult.status,
      message: processResult.message
    });
    console.log();
    
    // 3. ステータスを定期的にチェック
    console.log('3️⃣ 処理状況を監視...\n');
    
    let completed = false;
    let iteration = 0;
    const maxIterations = 60; // 最大5分間監視
    
    while (!completed && iteration < maxIterations) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
      
      const statusResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/async-status`);
      const status = await statusResponse.json();
      
      // 進捗を表示
      console.log(`[${new Date().toLocaleTimeString()}] 進捗状況:`);
      console.log(`  セッション状態: ${status.session.status}`);
      console.log(`  現在のフェーズ: ${status.session.currentPhase}`);
      console.log(`  現在のステップ: ${status.session.currentStep}`);
      console.log(`  タスク状況:`);
      console.log(`    - キュー: ${status.asyncTasks.summary.queued}`);
      console.log(`    - 処理中: ${status.asyncTasks.summary.processing}`);
      console.log(`    - 完了: ${status.asyncTasks.summary.completed}`);
      console.log(`    - 失敗: ${status.asyncTasks.summary.failed}`);
      console.log(`  進捗: ${status.progress.percentage}%`);
      console.log(`  推定残り時間: ${status.progress.estimatedTimeRemaining}`);
      
      // 現在のタスクの詳細
      if (status.asyncTasks.current.length > 0) {
        console.log(`  現在のタスク:`);
        status.asyncTasks.current.forEach(task => {
          console.log(`    - ${task.type} (${task.status}) - Phase ${task.phase} ${task.step}`);
          if (task.duration) {
            console.log(`      実行時間: ${Math.round(task.duration / 1000)}秒`);
          }
        });
      }
      
      console.log(`  次のアクション: ${status.nextAction.message}`);
      console.log();
      
      // 完了チェック
      if (status.session.status === 'COMPLETED') {
        completed = true;
        console.log('✅ 全ての処理が完了しました！');
        console.log(`下書きURL: ${status.nextAction.url}`);
      } else if (status.session.status === 'FAILED') {
        console.error('❌ 処理が失敗しました');
        console.log(`リカバリーURL: ${status.nextAction.url}`);
        break;
      } else if (status.nextAction.action === 'continue') {
        // 次のステップを実行
        console.log('📍 次のステップを実行...');
        const continueResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/process-async`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (continueResponse.ok) {
          const result = await continueResponse.json();
          console.log(`新しいタスクを開始: ${result.taskId || result.taskIds?.length + '件'}`);
        }
      }
      
      iteration++;
    }
    
    if (!completed && iteration >= maxIterations) {
      console.log('⏱️ タイムアウト: 5分以上経過しました');
    }
    
    // 4. 最終結果を表示
    console.log('\n4️⃣ 最終結果の確認...');
    const finalStatusResponse = await fetch(`${baseUrl}/api/viral/cot-session/${sessionId}/async-status`);
    const finalStatus = await finalStatusResponse.json();
    
    console.log('セッション最終状態:');
    console.log(`  - ID: ${finalStatus.session.id}`);
    console.log(`  - 状態: ${finalStatus.session.status}`);
    console.log(`  - 完了フェーズ: ${finalStatus.progress.completedPhases}/5`);
    console.log(`  - 総タスク数: ${finalStatus.asyncTasks.summary.total}`);
    
    // フェーズごとの結果
    console.log('\nフェーズごとの結果:');
    finalStatus.phases.forEach(phase => {
      console.log(`  Phase ${phase.number}:`);
      console.log(`    - 状態: ${phase.status}`);
      console.log(`    - THINK: ${phase.hasThink ? '✅' : '❌'}`);
      console.log(`    - EXECUTE: ${phase.hasExecute ? '✅' : '❌'}`);
      console.log(`    - INTEGRATE: ${phase.hasIntegrate ? '✅' : '❌'}`);
    });
    
    console.log('\n✅ テスト完了！');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// メイン処理
async function main() {
  console.log('🚀 X_BUZZ_FLOW 非同期CoTシステム テスト\n');
  
  const serverRunning = await fetch('http://localhost:3000').then(() => true).catch(() => false);
  if (!serverRunning) {
    console.error('❌ 開発サーバーが起動していません');
    console.log('💡 別のターミナルで以下を実行してください:');
    console.log('   npm run dev\n');
    process.exit(1);
  }
  
  // AsyncApiProcessorが起動しているか確認
  console.log('⚙️  非同期処理システムを確認中...');
  
  // Prismaでapiタスクテーブルの存在を確認
  const { PrismaClient } = require('./app/generated/prisma');
  const prisma = new PrismaClient();
  
  try {
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'api_tasks'
      )
    `;
    
    if (!tableExists[0].exists) {
      console.error('❌ api_tasksテーブルが存在しません');
      console.log('💡 以下のコマンドを実行してください:');
      console.log('   node scripts/create-api-task-tables.js\n');
      process.exit(1);
    }
    
    console.log('✅ データベース準備完了\n');
  } catch (e) {
    console.error('❌ データベース接続エラー:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
  
  await testAsyncCoT();
}

// 実行
main().catch(console.error);