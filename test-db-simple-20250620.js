const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 簡単なDB整合性チェック');
    
    // 1. viral_sessionsテーブルの存在確認
    console.log('1. viral_sessionsテーブル確認...');
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
          
          // このセッションでAPIテストを実行
          console.log('2. APIテスト実行...');
          const response = await fetch(`http://localhost:3000/api/create/flow/${readySession.id}/concepts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('  ✅ API成功:', data.success, 'コンセプト数:', data.conceptsCount);
          } else {
            const error = await response.text();
            console.log('  ❌ API失敗:', response.status, error);
          }
        } else {
          console.log('  ⚠️ コンセプト生成可能なセッションが見つかりません');
        }
      }
      
    } catch (error) {
      console.error('  ❌ viral_sessionsテーブルアクセスエラー:', error.message);
      
      // テーブル名を確認
      console.log('2. 利用可能なテーブル確認...');
      const result = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%viral%'
        ORDER BY table_name;
      `;
      console.log('  バイラル関連テーブル:', result);
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();