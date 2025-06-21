// 実際の下書きでDB更新テスト
const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function testDBUpdate() {
  console.log('🔍 DB更新機能テスト\n');
  
  try {
    // 既存の下書きを取得
    const draft = await prisma.viral_drafts.findFirst({
      where: { 
        session_id: 'sess_SdN8Je5lJAah',
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
    console.log('- tweet_id:', draft.tweet_id);
    console.log('- posted_at:', draft.posted_at);
    
    // テスト用のtweet_idを生成
    const testTweetId = 'test_' + Date.now();
    
    console.log('\n🔄 DB更新実行...');
    console.log('更新内容:');
    console.log('- status: POSTED');
    console.log('- tweet_id:', testTweetId);
    console.log('- posted_at: new Date()');
    
    const updated = await prisma.viral_drafts.update({
      where: { id: draft.id },
      data: {
        status: 'POSTED',
        tweet_id: testTweetId,
        posted_at: new Date()
      }
    });
    
    console.log('\n✅ 更新成功!');
    console.log('更新後の下書き:');
    console.log('- ID:', updated.id);
    console.log('- ステータス:', updated.status);
    console.log('- tweet_id:', updated.tweet_id);
    console.log('- posted_at:', updated.posted_at);
    
    // 元に戻す
    console.log('\n🔄 元の状態に戻す...');
    await prisma.viral_drafts.update({
      where: { id: draft.id },
      data: {
        status: 'DRAFT',
        tweet_id: null,
        posted_at: null
      }
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

testDBUpdate();