const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function clearAllPosts() {
  try {
    // すべてのScheduledPostsを削除（テスト投稿含む）
    const deletedScheduledPosts = await prisma.scheduledPost.deleteMany({});
    console.log(`削除したスケジュール投稿（テスト含む）: ${deletedScheduledPosts.count}件`);
    
    // BuzzPostsを削除（念のため）
    const deletedBuzzPosts = await prisma.buzzPost.deleteMany({});
    console.log(`削除したバズ投稿: ${deletedBuzzPosts.count}件`);
    
    // PostAnalyticsも削除
    const deletedAnalytics = await prisma.postAnalytics.deleteMany({});
    console.log(`削除した分析データ: ${deletedAnalytics.count}件`);
    
    console.log('\n✅ すべての投稿データ（テスト投稿含む）を削除しました');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllPosts();