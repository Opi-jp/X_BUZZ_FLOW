const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 DB整合性チェック（フィールド名修正版）');
    
    // 1. 基本的な接続テスト
    console.log('1. DB接続テスト...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('  ✅ DB接続成功:', result);
    
    // 2. viral_sessionsテーブルの確認
    console.log('2. viral_sessionsテーブル確認...');
    try {
      const sessionCount = await prisma.viral_sessions.count();
      console.log('  ✅ viral_sessionsテーブル存在:', sessionCount, '件');
      
      if (sessionCount > 0) {
        // 最新のセッションを取得（正しいフィールド名を使用）
        const sessions = await prisma.viral_sessions.findMany({
          select: { 
            id: true, 
            status: true, 
            topics: true, 
            concepts: true,
            theme: true,
            platform: true,
            style: true
          },
          orderBy: { created_at: 'desc' },
          take: 5
        });
        
        console.log('  最新セッション:');
        sessions.forEach(s => {
          console.log(`    ID: ${s.id}`);
          console.log(`    テーマ: ${s.theme}`);
          console.log(`    プラットフォーム: ${s.platform}`);
          console.log(`    スタイル: ${s.style}`);
          console.log(`    ステータス: ${s.status}`);
          console.log(`    トピックあり: ${!!s.topics}`);
          console.log(`    コンセプトあり: ${!!s.concepts}`);
          console.log('    ---');
        });
        
        // TOPICS_COLLECTEDのセッションを探す
        const readySession = sessions.find(s => s.status === 'TOPICS_COLLECTED' && s.topics);
        if (readySession) {
          console.log('  🎯 コンセプト生成可能なセッション:', readySession.id);
          console.log('  💡 このセッションでAPIテストを実行可能');
          return readySession.id;
        } else {
          console.log('  ⚠️ コンセプト生成可能なセッションが見つかりません');
          
          // 代替セッションを探す（トピックがあるもの）
          const anyWithTopics = sessions.find(s => s.topics);
          if (anyWithTopics) {
            console.log('  📋 トピック付きセッション発見:', anyWithTopics.id);
            console.log('  📊 ステータス:', anyWithTopics.status);
            return anyWithTopics.id;
          }
          
          // すべてのステータスを確認
          const statusCounts = {};
          sessions.forEach(s => {
            statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
          });
          console.log('  📊 ステータス分布:', statusCounts);
        }
      }
      
    } catch (error) {
      console.error('  ❌ viral_sessionsテーブルアクセスエラー:', error.message);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();