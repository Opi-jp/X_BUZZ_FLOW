const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createRealisticPresets() {
  console.log('=== 実用的なバズツイート収集プリセット作成 ===\n');
  console.log('方針: シンプルで効果的なクエリ + 強力なフィルタリング\n');
  
  const presets = [
    // 1. シンプルなAI活用
    {
      name: 'ChatGPT活用事例',
      description: 'ChatGPTの実践的な活用事例',
      query: 'ChatGPT 効率化 min_faves:1000 -is:retweet lang:ja',
      keywords: ['ChatGPT', '効率化', 'AI活用'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'chatgpt_usage'
    },
    {
      name: 'Claude活用事例',
      description: 'Claudeの実践的な活用事例',
      query: 'Claude 使い方 min_faves:500 -is:retweet lang:ja',
      keywords: ['Claude', '使い方', 'AI活用'],
      minLikes: 500,
      minRetweets: 100,
      category: 'claude_usage'
    },
    
    // 2. プロンプトエンジニアリング
    {
      name: 'プロンプト技術',
      description: '効果的なプロンプトの書き方',
      query: 'プロンプト ChatGPT min_faves:800 -is:retweet lang:ja',
      keywords: ['プロンプト', 'ChatGPT', 'テクニック'],
      minLikes: 800,
      minRetweets: 150,
      category: 'prompt'
    },
    
    // 3. 開発効率化
    {
      name: 'Copilot活用',
      description: 'GitHub Copilotでの開発効率化',
      query: '"GitHub Copilot" min_faves:300 -is:retweet lang:ja',
      keywords: ['GitHub Copilot', '開発', '効率化'],
      minLikes: 300,
      minRetweets: 50,
      category: 'copilot'
    },
    {
      name: 'Cursor活用',
      description: 'Cursor IDEの活用事例',
      query: 'Cursor エディタ min_faves:200 -is:retweet lang:ja',
      keywords: ['Cursor', 'エディタ', 'AI開発'],
      minLikes: 200,
      minRetweets: 30,
      category: 'cursor'
    },
    
    // 4. AI×ビジネス
    {
      name: 'AI業務改善',
      description: 'AIを使った業務改善事例',
      query: 'AI 業務効率化 min_faves:1000 -is:retweet lang:ja',
      keywords: ['AI', '業務効率化', 'ビジネス'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'ai_business'
    },
    {
      name: 'AI副業成功',
      description: 'AIを活用した副業の成功事例',
      query: 'ChatGPT 副業 月収 min_faves:1500 -is:retweet lang:ja',
      keywords: ['ChatGPT', '副業', '収益化'],
      minLikes: 1500,
      minRetweets: 300,
      category: 'ai_income'
    },
    
    // 5. クリエイティブAI
    {
      name: 'Midjourney作品',
      description: 'Midjourneyを使った作品制作',
      query: 'Midjourney 作品 min_faves:1000 -is:retweet lang:ja',
      keywords: ['Midjourney', '作品', 'AI画像'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'midjourney'
    },
    {
      name: 'StableDiffusion活用',
      description: 'Stable Diffusionの活用事例',
      query: '"Stable Diffusion" min_faves:800 -is:retweet lang:ja',
      keywords: ['Stable Diffusion', 'AI画像', 'クリエイティブ'],
      minLikes: 800,
      minRetweets: 150,
      category: 'stable_diffusion'
    },
    
    // 6. 学習・スキルアップ
    {
      name: 'AI学習体験',
      description: 'AI関連スキルの学習体験談',
      query: 'Python AI 学習 min_faves:500 -is:retweet lang:ja',
      keywords: ['Python', 'AI学習', 'プログラミング'],
      minLikes: 500,
      minRetweets: 100,
      category: 'ai_learning'
    }
  ];
  
  try {
    // 既存のプリセットを削除
    await prisma.collectionPreset.deleteMany({});
    console.log('既存のプリセットを削除しました。\n');
    
    // 新しいプリセットを作成
    for (const preset of presets) {
      const created = await prisma.collectionPreset.create({
        data: preset
      });
      console.log(`✅ 作成: ${created.name}`);
      console.log(`   クエリ: ${created.query}`);
      console.log(`   最小いいね: ${created.minLikes}`);
      console.log(`   最小RT: ${created.minRetweets}\n`);
    }
    
    console.log(`\n合計 ${presets.length} 個の実用的プリセットを作成しました。`);
    console.log('\n特徴:');
    console.log('- シンプルなクエリ構造');
    console.log('- min_favesによる品質保証');
    console.log('- 収集後のフィルタリングで精度向上');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRealisticPresets();