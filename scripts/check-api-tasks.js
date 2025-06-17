const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function checkApiTasks() {
  try {
    // 全タスクの状態を確認
    const allTasks = await prisma.$queryRaw`
      SELECT id, session_id, type, status, phase_number, step_name, 
             retry_count, created_at, updated_at
      FROM api_tasks
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('\n=== 最新のAPIタスク（10件） ===');
    console.log('件数:', allTasks.length);
    
    for (const task of allTasks) {
      console.log(`\nタスクID: ${task.id}`);
      console.log(`  セッション: ${task.session_id}`);
      console.log(`  タイプ: ${task.type}`);
      console.log(`  ステータス: ${task.status}`);
      console.log(`  フェーズ: ${task.phase_number} / ステップ: ${task.step_name}`);
      console.log(`  リトライ: ${task.retry_count}`);
      console.log(`  作成: ${task.created_at}`);
      console.log(`  更新: ${task.updated_at}`);
    }
    
    // 統計情報
    const stats = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM api_tasks
      GROUP BY status
    `;
    
    console.log('\n=== タスク統計 ===');
    for (const stat of stats) {
      console.log(`${stat.status}: ${stat.count}件`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiTasks();