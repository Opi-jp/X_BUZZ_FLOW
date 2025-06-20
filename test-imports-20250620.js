// インポートとDB接続の基本テスト
async function testImports() {
  try {
    console.log('🔍 インポートとDB接続テスト');
    
    // 1. Prismaのインポートと接続
    console.log('\n1️⃣ Prismaインポート...');
    const { PrismaClient } = require('./lib/generated/prisma');
    const prisma = new PrismaClient();
    console.log('  ✅ Prismaインポート成功');
    
    // 2. 簡単なクエリ
    const count = await prisma.viral_sessions.count();
    console.log('  ✅ DBクエリ成功:', count, '件');
    
    // 3. unified-system-managerのインポート
    console.log('\n2️⃣ 統一システムマネージャーインポート...');
    try {
      const USM = require('./lib/core/unified-system-manager');
      console.log('  利用可能なエクスポート:', Object.keys(USM));
      
      // DBManagerのテスト
      if (USM.DBManager) {
        console.log('  ✅ DBManager存在');
        
        // トランザクションテスト
        const result = await USM.DBManager.transaction(async (tx) => {
          const session = await tx.viral_sessions.findFirst({
            where: { id: 'sess_j2aTllyraxSi' }
          });
          return session ? 'Found' : 'Not found';
        });
        console.log('  ✅ DBManager.transaction成功:', result);
      }
      
      // ErrorManagerのテスト
      if (USM.ErrorManager) {
        console.log('  ✅ ErrorManager存在');
      }
      
    } catch (error) {
      console.log('  ❌ 統一システムマネージャーエラー:', error.message);
    }
    
    // 4. ClaudeLoggerのインポート
    console.log('\n3️⃣ ClaudeLoggerインポート...');
    try {
      const { claudeLog } = require('./lib/core/claude-logger');
      console.log('  ✅ claudeLogインポート成功');
      console.log('  型:', typeof claudeLog);
      console.log('  メソッド:', Object.keys(claudeLog).slice(0, 5));
    } catch (error) {
      console.log('  ❌ ClaudeLoggerエラー:', error.message);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testImports();