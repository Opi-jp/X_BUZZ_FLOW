const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function checkDraft() {
  try {
    const draft = await prisma.viral_drafts_v2.findFirst({
      where: { session_id: 'sess_SdN8Je5lJAah' }
    });
    
    console.log('Draft found:', JSON.stringify(draft, null, 2));
    
    if (draft) {
      console.log('\n📋 下書き詳細:');
      console.log('ID:', draft.id);
      console.log('タイトル:', draft.title);
      console.log('セッションID:', draft.session_id);
      console.log('コンテンツ長:', draft.content ? draft.content.length : 0);
      console.log('ハッシュタグ:', draft.hashtags);
      console.log('キャラクター:', draft.character_id);
      console.log('ステータス:', draft.status);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDraft();
