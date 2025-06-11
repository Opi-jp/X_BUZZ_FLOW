const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function optimizePresets() {
  try {
    console.log('プリセットの最適化を開始...');
    
    // 最適化されたクエリパターン
    const optimizedQueries = [
      {
        name: 'AI×クリエイティブ実践',
        query: '(AI OR ChatGPT OR Claude) AND (クリエイティブ OR デザイン OR 制作) min_faves:500',
        category: 'ai_creative_practice',
        minLikes: 500,
        minRetweets: 50
      },
      {
        name: 'LLM業務効率化',
        query: '(ChatGPT OR Claude OR "生成AI") AND (効率化 OR 業務改善 OR 時短) min_faves:800',
        category: 'llm_efficiency',
        minLikes: 800,
        minRetweets: 100
      },
      {
        name: 'AI時代の働き方',
        query: '(AI時代 OR "AIで変わる") AND (働き方 OR キャリア OR 仕事) min_faves:1000',
        category: 'ai_work_change',
        minLikes: 1000,
        minRetweets: 150
      },
      {
        name: 'プロンプト実践術',
        query: '(プロンプト OR "プロンプトエンジニアリング") AND (テクニック OR 実践 OR 活用) min_faves:500',
        category: 'prompt_practice',
        minLikes: 500,
        minRetweets: 80
      },
      {
        name: '50代×AI活用',
        query: '(50代 OR シニア OR ミドル) AND (AI OR ChatGPT) AND (活用 OR 学習) min_faves:300',
        category: 'senior_ai',
        minLikes: 300,
        minRetweets: 50
      }
    ];
    
    // 既存のアクティブなプリセットを非アクティブ化
    await prisma.collectionPreset.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    
    // 最適化されたプリセットを作成または更新
    for (const preset of optimizedQueries) {
      const existing = await prisma.collectionPreset.findFirst({
        where: { name: preset.name }
      });
      
      if (existing) {
        await prisma.collectionPreset.update({
          where: { id: existing.id },
          data: {
            query: preset.query,
            minLikes: preset.minLikes,
            minRetweets: preset.minRetweets,
            isActive: true,
            keywords: preset.query.match(/\w+/g) || []
          }
        });
        console.log(`更新: ${preset.name}`);
      } else {
        await prisma.collectionPreset.create({
          data: {
            name: preset.name,
            query: preset.query,
            category: preset.category,
            minLikes: preset.minLikes,
            minRetweets: preset.minRetweets,
            language: 'ja',
            isActive: true,
            keywords: preset.query.match(/\w+/g) || []
          }
        });
        console.log(`作成: ${preset.name}`);
      }
    }
    
    console.log('\nプリセットの最適化が完了しました！');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

optimizePresets();