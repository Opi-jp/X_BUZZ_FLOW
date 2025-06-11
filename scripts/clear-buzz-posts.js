const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function clearBuzzPosts() {
  try {
    // まず関連するScheduledPostsを削除
    const deletedScheduledPosts = await prisma.scheduledPost.deleteMany({
      where: {
        refPostId: { not: null }
      }
    });
    console.log(`削除したスケジュール投稿: ${deletedScheduledPosts.count}件`);
    
    // BuzzPostsを削除
    const deletedBuzzPosts = await prisma.buzzPost.deleteMany({});
    console.log(`削除したバズ投稿: ${deletedBuzzPosts.count}件`);
    
    // PostAnalyticsも削除
    const deletedAnalytics = await prisma.postAnalytics.deleteMany({});
    console.log(`削除した分析データ: ${deletedAnalytics.count}件`);
    
    console.log('\n✅ すべてのバズ投稿データを削除しました');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearBuzzPosts();