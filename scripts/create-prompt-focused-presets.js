const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createPromptFocusedPresets() {
  console.log('=== プロンプト特化型プリセット追加 ===\n');
  console.log('既存のプリセットに、プロンプト関連を強化\n');
  
  // プロンプト関連の新規プリセット
  const promptPresets = [
    {
      name: 'プロンプトテンプレート集',
      description: 'コピペで使えるプロンプトテンプレート',
      query: 'プロンプト (テンプレート OR コピペ OR まとめ) min_faves:100 -is:retweet lang:ja',
      keywords: ['プロンプト', 'テンプレート', 'コピペ', 'まとめ'],
      minLikes: 100,
      minRetweets: 20,
      category: 'prompt_template'
    },
    {
      name: '神プロンプト集',
      description: '効果的な神プロンプトの共有',
      query: '(神プロンプト OR 最強プロンプト OR 秘伝プロンプト) min_faves:200 -is:retweet lang:ja',
      keywords: ['神プロンプト', '最強', '秘伝', 'プロンプト'],
      minLikes: 200,
      minRetweets: 30,
      category: 'prompt_best'
    },
    {
      name: 'プロンプトエンジニアリング',
      description: 'プロンプトエンジニアリングの技術',
      query: 'プロンプトエンジニアリング (技術 OR テクニック OR 方法) min_faves:150 -is:retweet lang:ja',
      keywords: ['プロンプトエンジニアリング', '技術', 'テクニック'],
      minLikes: 150,
      minRetweets: 25,
      category: 'prompt_engineering'
    },
    {
      name: 'ChatGPTプロンプト集',
      description: 'ChatGPT専用のプロンプト集',
      query: 'ChatGPT プロンプト (150選 OR 100選 OR 集 OR リスト) min_faves:300 -is:retweet lang:ja',
      keywords: ['ChatGPT', 'プロンプト', '選', '集'],
      minLikes: 300,
      minRetweets: 50,
      category: 'chatgpt_prompts'
    },
    {
      name: 'Claudeプロンプト',
      description: 'Claude用のプロンプトテクニック',
      query: 'Claude (プロンプト OR システムプロンプト) min_faves:100 -is:retweet lang:ja',
      keywords: ['Claude', 'プロンプト', 'システムプロンプト'],
      minLikes: 100,
      minRetweets: 20,
      category: 'claude_prompts'
    },
    {
      name: '業務プロンプト',
      description: '業務で使えるプロンプト集',
      query: 'プロンプト (業務 OR 仕事 OR ビジネス) (効率化 OR 改善) min_faves:150 -is:retweet lang:ja',
      keywords: ['プロンプト', '業務', 'ビジネス', '効率化'],
      minLikes: 150,
      minRetweets: 25,
      category: 'business_prompts'
    },
    {
      name: 'プロンプト活用事例',
      description: '実際のプロンプト活用事例',
      query: 'プロンプト (使ってみた OR 試してみた OR 効果) (結果 OR 成果) min_faves:100 -is:retweet lang:ja',
      keywords: ['プロンプト', '活用', '事例', '効果'],
      minLikes: 100,
      minRetweets: 20,
      category: 'prompt_cases'
    },
    {
      name: 'プロンプト無料配布',
      description: '無料で配布されているプロンプト',
      query: 'プロンプト (無料 OR 配布 OR プレゼント) min_faves:200 -is:retweet lang:ja',
      keywords: ['プロンプト', '無料', '配布', 'プレゼント'],
      minLikes: 200,
      minRetweets: 30,
      category: 'prompt_free'
    },
    {
      name: 'プロンプト設計',
      description: 'プロンプトの設計方法',
      query: 'プロンプト (設計 OR 作り方 OR 構造 OR フレームワーク) min_faves:100 -is:retweet lang:ja',
      keywords: ['プロンプト', '設計', '作り方', 'フレームワーク'],
      minLikes: 100,
      minRetweets: 20,
      category: 'prompt_design_advanced'
    },
    {
      name: '画像生成プロンプト',
      description: '画像生成AI用のプロンプト',
      query: '(Midjourney OR "Stable Diffusion" OR DALL-E) プロンプト min_faves:200 -is:retweet lang:ja',
      keywords: ['Midjourney', 'Stable Diffusion', 'DALL-E', 'プロンプト'],
      minLikes: 200,
      minRetweets: 30,
      category: 'image_prompts'
    }
  ];
  
  try {
    // 既存のプリセットは保持し、新規追加のみ
    console.log('プロンプト関連プリセットを追加中...\n');
    
    // 新しいプリセットを作成
    for (const preset of promptPresets) {
      // 同じカテゴリが既に存在するかチェック
      const existing = await prisma.collectionPreset.findFirst({
        where: { category: preset.category }
      });
      
      if (!existing) {
        const created = await prisma.collectionPreset.create({
          data: preset
        });
        console.log(`✅ 追加: ${created.name}`);
        console.log(`   クエリ: ${created.query}`);
        console.log(`   最小いいね: ${created.minLikes}\n`);
      } else {
        console.log(`⏭️  スキップ: ${preset.name} (既存)\n`);
      }
    }
    
    // 全プリセット数を確認
    const totalCount = await prisma.collectionPreset.count();
    console.log(`\n合計 ${totalCount} 個のプリセットが登録されています。`);
    console.log('\nプロンプト関連プリセットの特徴:');
    console.log('- コピペで使えるテンプレート収集');
    console.log('- 神プロンプト・秘伝プロンプトの発掘');
    console.log('- 業務特化型プロンプト');
    console.log('- 無料配布されているプロンプト集');
    console.log('- 画像生成用プロンプト');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPromptFocusedPresets();