const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkSpecificPost() {
  try {
    // 特定のIDで検索
    const testId = '1932599308043645249';
    
    console.log(`=== 特定の投稿ID検索: ${testId} ===\n`);
    
    const post = await prisma.buzzPost.findUnique({
      where: { postId: testId }
    });
    
    if (post) {
      console.log('❌ 投稿が見つかりました！');
      console.log('ID:', post.id);
      console.log('PostID:', post.postId);
      console.log('Content:', post.content.substring(0, 100));
      console.log('CollectedAt:', post.collectedAt);
    } else {
      console.log('✅ 投稿は存在しません');
    }
    
    // 全件数も確認
    const count = await prisma.buzzPost.count();
    console.log(`\n現在のBuzzPost総数: ${count}件`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificPost();