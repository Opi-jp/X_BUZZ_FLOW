import { DBManager } from './lib/core/unified-system-manager.js';
import { prisma } from './lib/prisma.js';

async function main() {
  try {
    console.log('🔧 DBManagerを使った整合性チェック');
    
    // 1. まずDBManagerのトランザクション機能をテスト
    console.log('1. DBManager トランザクションテスト...');
    const result = await DBManager.transaction(async (tx) => {
      // テスト用の簡単なクエリ
      const userCount = await tx.users.count();
      console.log('  ユーザー数:', userCount);
      return userCount;
    });
    console.log('  ✅ DBManager動作確認完了');
    
    // 2. viral_sessionsテーブルの存在確認
    console.log('2. viral_sessionsテーブル確認...');
    try {
      const sessionCount = await prisma.viral_sessions.count();
      console.log('  ✅ viral_sessionsテーブル存在:', sessionCount, '件');
      
      // 最新のセッションを取得
      const sessions = await prisma.viral_sessions.findMany({
        select: { id: true, status: true, topics: true, concepts: true },
        orderBy: { createdAt: 'desc' },
        take: 3
      });
      
      console.log('  最新セッション:');
      sessions.forEach(s => {
        console.log(`    ID: ${s.id}`);
        console.log(`    ステータス: ${s.status}`);
        console.log(`    トピックあり: ${!!s.topics}`);
        console.log(`    コンセプトあり: ${!!s.concepts}`);
        console.log('    ---');
      });
      
      // TOPICS_COLLECTEDのセッションを探す
      const readySession = sessions.find(s => s.status === 'TOPICS_COLLECTED' && s.topics);
      if (readySession) {
        console.log('  🎯 コンセプト生成可能なセッション:', readySession.id);
      } else {
        console.log('  ⚠️ コンセプト生成可能なセッションが見つかりません');
      }
      
    } catch (error) {
      console.error('  ❌ viral_sessionsテーブルアクセスエラー:', error.message);
    }
    
    // 3. 統一システムマネージャーのID生成テスト
    console.log('3. IDGenerator テスト...');
    const { IDGenerator, EntityType } = await import('./lib/core/unified-system-manager.js');
    const sessionId = IDGenerator.generate(EntityType.VIRAL_SESSION);
    console.log('  新しいセッションID:', sessionId);
    console.log('  IDバリデーション:', IDGenerator.validate(sessionId, EntityType.VIRAL_SESSION));
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();