const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 DB整合性チェック（修正版）');
    
    // 1. 基本的な接続テスト
    console.log('1. DB接続テスト...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('  ✅ DB接続成功:', result);
    
    // 2. viral_sessionsテーブルの存在確認
    console.log('2. viral_sessionsテーブル確認...');
    try {
      const sessionCount = await prisma.viral_sessions.count();
      console.log('  ✅ viral_sessionsテーブル存在:', sessionCount, '件');
      
      if (sessionCount > 0) {
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
          return readySession.id; // テスト用に返す
        } else {
          console.log('  ⚠️ コンセプト生成可能なセッションが見つかりません');
          
          // 代替セッションを探す（トピックがあるもの）
          const anyWithTopics = sessions.find(s => s.topics);
          if (anyWithTopics) {
            console.log('  📋 トピック付きセッション発見:', anyWithTopics.id);
            return anyWithTopics.id;
          }
        }
      }
      
    } catch (error) {
      console.error('  ❌ viral_sessionsテーブルアクセスエラー:', error.message);
      
      // テーブル名を確認
      console.log('3. 利用可能なテーブル確認...');
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%viral%'
        ORDER BY table_name;
      `;
      console.log('  バイラル関連テーブル:', tables);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();