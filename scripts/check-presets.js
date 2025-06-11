const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkPresets() {
  try {
    const presets = await prisma.collectionPreset.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\n=== コレクションプリセット一覧 ===\n');
    presets.forEach((preset, index) => {
      console.log(`${index + 1}. ${preset.name}`);
      console.log(`   説明: ${preset.description || 'なし'}`);
      console.log(`   カテゴリ: ${preset.category}`);
      console.log(`   キーワード: ${preset.keywords.join(', ')}`);
      console.log(`   最小いいね: ${preset.minLikes}`);
      console.log(`   最小RT: ${preset.minRetweets}`);
      console.log(`   アクティブ: ${preset.isActive ? 'はい' : 'いいえ'}`);
      console.log('');
    });
    
    // この投稿がどのプリセットでヒットしたか確認
    const post = await prisma.buzzPost.findFirst({
      where: {
        authorUsername: 'arcnight101',
        postedAt: {
          gte: new Date('2025-06-11T00:00:00Z'),
          lt: new Date('2025-06-11T23:59:59Z')
        }
      }
    });
    
    if (post) {
      console.log('\n=== 該当投稿の詳細 ===');
      console.log(`テーマ: ${post.theme}`);
      console.log(`内容: ${post.content.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPresets();