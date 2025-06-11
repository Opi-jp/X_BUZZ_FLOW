const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkBuzzPosts() {
  try {
    // 総件数
    const totalCount = await prisma.buzzPost.count();
    console.log(`\n総バズ投稿数: ${totalCount}件\n`);
    
    // 最新10件
    const latestPosts = await prisma.buzzPost.findMany({
      orderBy: { collectedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        authorUsername: true,
        likesCount: true,
        theme: true,
        collectedAt: true,
        postedAt: true,
        content: true
      }
    });
    
    console.log('=== 最新の収集投稿 TOP 10 ===\n');
    latestPosts.forEach((post, index) => {
      console.log(`${index + 1}. @${post.authorUsername}`);
      console.log(`   テーマ: ${post.theme}`);
      console.log(`   いいね: ${post.likesCount.toLocaleString()}`);
      console.log(`   投稿日: ${post.postedAt.toLocaleString('ja-JP')}`);
      console.log(`   収集日: ${post.collectedAt.toLocaleString('ja-JP')}`);
      console.log(`   内容: ${post.content.substring(0, 50)}...`);
      console.log('');
    });
    
    // 過去24時間の収集
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent24h = await prisma.buzzPost.count({
      where: {
        collectedAt: { gte: since24h }
      }
    });
    
    console.log(`過去24時間の収集: ${recent24h}件`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBuzzPosts();