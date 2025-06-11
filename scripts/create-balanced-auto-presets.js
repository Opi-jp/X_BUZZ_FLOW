const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createBalancedPresets() {
  try {
    console.log('バランスの取れた自動化プリセットを作成...\n');
    
    // 自動化用のプリセットのみを更新
    const balancedAutoPresets = [
      {
        name: '【自動】AI×クリエイティブ実践',
        description: '毎朝自動収集：AIをクリエイティブに活用した実践例',
        query: '(AI OR ChatGPT OR Claude) (クリエイティブ OR デザイン OR 制作) (活用 OR 使い方 OR 実践)',
        category: 'auto_ai_creative',
        keywords: ['AI', 'クリエイティブ', 'デザイン', '活用'],
        minLikes: 800,
        minRetweets: 80
      },
      {
        name: '【自動】AI働き方変革',
        description: '毎朝自動収集：AIで変わる働き方・効率化の実例',
        query: '(AI OR ChatGPT OR 生成AI) (働き方 OR 業務 OR 効率化) (変わった OR 改善 OR 短縮)',
        category: 'auto_ai_work',
        keywords: ['AI', '働き方', '効率化', '改善'],
        minLikes: 1000,
        minRetweets: 100
      },
      {
        name: '【自動】LLM実践活用',
        description: '毎朝自動収集：ChatGPT/Claudeの具体的な活用事例',
        query: '(ChatGPT OR Claude) (活用 OR 使い方 OR やり方) (実際 OR 実践 OR 効果)',
        category: 'auto_llm_practice',
        keywords: ['ChatGPT', 'Claude', '活用', '実践'],
        minLikes: 1500,
        minRetweets: 150
      }
    ];
    
    // 既存の自動化プリセットを更新
    for (const preset of balancedAutoPresets) {
      const existing = await prisma.collectionPreset.findFirst({
        where: { 
          name: { startsWith: '【自動】' },
          category: preset.category
        }
      });
      
      if (existing) {
        await prisma.collectionPreset.update({
          where: { id: existing.id },
          data: {
            name: preset.name,
            description: preset.description,
            query: preset.query,
            keywords: preset.keywords,
            minLikes: preset.minLikes,
            minRetweets: preset.minRetweets,
            isActive: true
          }
        });
        console.log(`✅ 更新: ${preset.name}`);
      }
      
      console.log(`   クエリ: ${preset.query}`);
      console.log(`   最小いいね: ${preset.minLikes}`);
      console.log(`   除外: 政治、エンタメ、スパム（API側で自動フィルタリング）\n`);
    }
    
    console.log('バランスの取れたクエリに更新しました！');
    console.log('\n特徴:');
    console.log('- 複数の関連キーワードを組み合わせて精度向上');
    console.log('- 実践・活用に焦点を当てて質の高い投稿を収集');
    console.log('- エンゲージメント基準を適切に設定');
    console.log('- API側で政治・エンタメ等は自動除外');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBalancedPresets();