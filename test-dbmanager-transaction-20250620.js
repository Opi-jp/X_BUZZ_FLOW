// DBManagerトランザクションテスト
const { DBManager } = require('./lib/core/unified-system-manager');
const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function testDBManagerTransaction() {
  console.log('🔍 DBManagerトランザクションテスト\n');
  
  try {
    // 既存の下書きを取得
    const draft = await prisma.viral_drafts.findFirst({
      where: { 
        session_id: 'sess_xwLPYSL4Ppwc',
        status: 'DRAFT'
      }
    });
    
    if (!draft) {
      console.log('❌ 下書きが見つかりません');
      return;
    }
    
    console.log('📋 対象の下書き:');
    console.log('- ID:', draft.id);
    console.log('- タイトル:', draft.title);
    console.log('- ステータス:', draft.status);
    
    // テスト用のtweet_idを生成
    const testTweetId = 'test_' + Date.now();
    
    console.log('\n🔄 DBManagerでトランザクション実行...');
    console.log('更新内容:');
    console.log('- status: POSTED');
    console.log('- tweet_id:', testTweetId);
    console.log('- posted_at: new Date()');
    
    const updated = await DBManager.transaction(async (tx) => {
      console.log('トランザクション内: tx.viral_drafts =', typeof tx.viral_drafts);
      console.log('トランザクション内: tx.viral_drafts.update =', typeof tx.viral_drafts?.update);
      
      const result = await tx.viral_drafts.update({
        where: { id: draft.id },
        data: {
          status: 'POSTED',
          tweet_id: testTweetId,
          posted_at: new Date()
        }
      });
      
      console.log('トランザクション内: 更新成功');
      return result;
    });
    
    console.log('\n✅ 更新成功!');
    console.log('更新後の下書き:');
    console.log('- ID:', updated.id);
    console.log('- ステータス:', updated.status);
    console.log('- tweet_id:', updated.tweet_id);
    console.log('- posted_at:', updated.posted_at);
    
    // 元に戻す
    console.log('\n🔄 元の状態に戻す...');
    await DBManager.transaction(async (tx) => {
      await tx.viral_drafts.update({
        where: { id: draft.id },
        data: {
          status: 'DRAFT',
          tweet_id: null,
          posted_at: null
        }
      });
    });
    console.log('✓ 元に戻しました');
    
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error('エラータイプ:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    console.error('スタックトレース:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// 環境変数をロード
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

testDBManagerTransaction();