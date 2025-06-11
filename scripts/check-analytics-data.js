const { PrismaClient } = require('../app/generated/prisma');

const prisma = new PrismaClient();

async function checkAnalytics() {
  try {
    // PostAnalyticsの件数を確認
    const analyticsCount = await prisma.postAnalytics.count();
    console.log(`PostAnalytics総数: ${analyticsCount}件`);

    // ScheduledPostsの件数を確認
    const scheduledPostsCount = await prisma.scheduledPost.count();
    console.log(`ScheduledPost総数: ${scheduledPostsCount}件`);

    // 投稿済みのScheduledPostsの件数を確認
    const postedCount = await prisma.scheduledPost.count({
      where: { status: 'POSTED' }
    });
    console.log(`投稿済みScheduledPost: ${postedCount}件`);

    // 最新のAnalyticsデータを5件取得
    const latestAnalytics = await prisma.postAnalytics.findMany({
      take: 5,
      orderBy: { measuredAt: 'desc' },
      include: {
        scheduledPost: true
      }
    });

    console.log('\n最新の分析データ:');
    latestAnalytics.forEach(analytics => {
      console.log(`- ID: ${analytics.id}`);
      console.log(`  インプレッション: ${analytics.impressions}`);
      console.log(`  いいね: ${analytics.likes}`);
      console.log(`  RT: ${analytics.retweets}`);
      console.log(`  エンゲージメント率: ${(analytics.engagementRate * 100).toFixed(2)}%`);
      console.log(`  測定日時: ${analytics.measuredAt}`);
      console.log(`  投稿内容: ${analytics.scheduledPost.content.substring(0, 50)}...`);
      console.log('---');
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAnalytics();