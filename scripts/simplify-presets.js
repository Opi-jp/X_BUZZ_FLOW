const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function simplifyPresets() {
  try {
    console.log('プリセットの簡素化を開始...\n');
    
    // 既存のプリセットをすべて非アクティブ化
    await prisma.collectionPreset.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    
    // シンプルで効果的な3つのプリセットのみ
    const simplePresets = [
      {
        name: 'AI×クリエイティブ',
        description: 'AIとクリエイティブの実践例',
        query: 'AI クリエイティブ',
        category: 'ai_creative',
        keywords: ['AI', 'クリエイティブ', 'デザイン', '制作'],
        minLikes: 1000,
        minRetweets: 100
      },
      {
        name: 'AI働き方革命',
        description: 'AIで変わる働き方',
        query: 'AI 働き方',
        category: 'ai_work',
        keywords: ['AI', '働き方', '効率化', 'キャリア'],
        minLikes: 1500,
        minRetweets: 200
      },
      {
        name: 'ChatGPT/Claude活用',
        description: 'LLMツールの実践活用',
        query: 'ChatGPT OR Claude 活用',
        category: 'llm_practice',
        keywords: ['ChatGPT', 'Claude', '活用', '実践'],
        minLikes: 2000,
        minRetweets: 300
      }
    ];
    
    // シンプルなプリセットを作成
    for (const preset of simplePresets) {
      const existing = await prisma.collectionPreset.findFirst({
        where: { name: preset.name }
      });
      
      if (existing) {
        await prisma.collectionPreset.update({
          where: { id: existing.id },
          data: {
            ...preset,
            isActive: true,
            language: 'ja'
          }
        });
        console.log(`更新: ${preset.name}`);
      } else {
        await prisma.collectionPreset.create({
          data: {
            ...preset,
            isActive: true,
            language: 'ja'
          }
        });
        console.log(`作成: ${preset.name}`);
      }
      
      console.log(`  クエリ: ${preset.query}`);
      console.log(`  最小いいね: ${preset.minLikes}`);
      console.log(`  最小RT: ${preset.minRetweets}\n`);
    }
    
    console.log('プリセットの簡素化が完了しました！');
    console.log('アクティブなプリセット数: 3');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simplifyPresets();