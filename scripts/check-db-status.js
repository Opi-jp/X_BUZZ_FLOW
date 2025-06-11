const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkDbStatus() {
  try {
    // 各テーブルのレコード数を確認
    const buzzPostsCount = await prisma.buzzPost.count();
    const scheduledPostsCount = await prisma.scheduledPost.count();
    const analyticsCount = await prisma.postAnalytics.count();
    
    console.log('=== データベースの状態 ===');
    console.log(`BuzzPosts: ${buzzPostsCount}件`);
    console.log(`ScheduledPosts: ${scheduledPostsCount}件`);
    console.log(`PostAnalytics: ${analyticsCount}件`);
    
    // 最新のBuzzPostを5件取得
    if (buzzPostsCount > 0) {
      console.log('\n=== 最新のBuzzPosts（5件） ===');
      const latestPosts = await prisma.buzzPost.findMany({
        take: 5,
        orderBy: { collectedAt: 'desc' },
        select: {
          id: true,
          postId: true,
          content: true,
          collectedAt: true
        }
      });
      
      latestPosts.forEach((post, index) => {
        console.log(`\n${index + 1}. ID: ${post.id}`);
        console.log(`   PostID: ${post.postId}`);
        console.log(`   Content: ${post.content.substring(0, 50)}...`);
        console.log(`   CollectedAt: ${post.collectedAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDbStatus();