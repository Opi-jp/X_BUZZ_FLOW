#!/usr/bin/env node

/**
 * 不要なセッションをクリーンアップするスクリプト
 */

const dotenv = require('dotenv');
const path = require('path');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function cleanupSessions() {
  try {
    console.log('🧹 セッションのクリーンアップを開始...\n');
    
    // 完了したセッション（成功例として1つ残す）
    const completedSessions = await prisma.cotSession.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { drafts: true }
    });
    
    console.log(`完了セッション数: ${completedSessions.length}`);
    
    // 下書きがあるセッションを1つ残す
    const keepSessionId = completedSessions.find(s => s.drafts.length > 0)?.id || completedSessions[0]?.id;
    
    if (keepSessionId) {
      console.log(`✅ 保持するセッション: ${keepSessionId}`);
    }
    
    // 統計情報を取得
    const stats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM cot_sessions
      GROUP BY status
    `;
    
    console.log('\n現在のセッション統計:');
    stats.forEach(s => {
      console.log(`  ${s.status}: ${s.count}件`);
    });
    
    // 削除対象を確認
    const toDelete = await prisma.cotSession.findMany({
      where: {
        AND: [
          { id: { not: keepSessionId || '' } },
          {
            OR: [
              { status: { in: ['PENDING', 'FAILED', 'PAUSED'] } },
              { status: 'EXECUTING', updatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } }, // 1時間以上前
              { status: 'INTEGRATING', updatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
              { status: 'THINKING', updatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
              { status: 'COMPLETED', id: { not: keepSessionId || '' } }
            ]
          }
        ]
      }
    });
    
    console.log(`\n削除対象: ${toDelete.length}件`);
    
    if (toDelete.length > 0) {
      console.log('\n削除を実行しますか？ (5秒後に自動実行)');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 関連するAPIタスクも含めて削除
      console.log('\n削除中...');
      
      // APIタスクを削除
      const deletedTasks = await prisma.$executeRaw`
        DELETE FROM api_tasks 
        WHERE session_id IN (${toDelete.map(s => s.id).join(',').split(',').map(id => `'${id}'`).join(',')})
      `;
      console.log(`  APIタスク: ${deletedTasks}件削除`);
      
      // セッションを削除（関連データも自動削除）
      const deletedSessions = await prisma.cotSession.deleteMany({
        where: {
          id: { in: toDelete.map(s => s.id) }
        }
      });
      
      console.log(`  セッション: ${deletedSessions.count}件削除`);
      console.log('\n✅ クリーンアップ完了');
    } else {
      console.log('\n削除対象なし');
    }
    
    // 最終統計
    const finalStats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM cot_sessions
      GROUP BY status
    `;
    
    console.log('\nクリーンアップ後の統計:');
    finalStats.forEach(s => {
      console.log(`  ${s.status}: ${s.count}件`);
    });
    
    const totalSessions = await prisma.cotSession.count();
    console.log(`\n合計セッション数: ${totalSessions}`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
cleanupSessions();