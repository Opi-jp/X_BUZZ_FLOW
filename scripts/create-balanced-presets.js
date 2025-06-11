const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createBalancedPresets() {
  console.log('=== バランス調整されたバズツイート収集プリセット作成 ===\n');
  console.log('より多くの良質な投稿を収集できるよう調整\n');
  
  const presets = [
    // 1. Claude関連（エンゲージメント要件を下げる）
    {
      name: 'Claude実践活用',
      description: 'Claudeの実践的な活用事例と使い方',
      query: 'Claude 使い方 min_faves:100 -is:retweet lang:ja',
      keywords: ['Claude', '使い方', 'AI活用', 'システムプロンプト'],
      minLikes: 100,
      minRetweets: 20,
      category: 'claude'
    },
    {
      name: 'Claude Code活用',
      description: 'Claude Codeの具体的な活用方法',
      query: '"Claude Code" min_faves:50 -is:retweet lang:ja',
      keywords: ['Claude Code', 'KDDI', '開発', 'AI'],
      minLikes: 50,
      minRetweets: 10,
      category: 'claude_code'
    },
    
    // 2. ChatGPT関連
    {
      name: 'ChatGPT実践活用',
      description: 'ChatGPTの実践的な活用事例',
      query: 'ChatGPT 活用 min_faves:200 -is:retweet lang:ja',
      keywords: ['ChatGPT', '活用', '効率化', 'AI'],
      minLikes: 200,
      minRetweets: 30,
      category: 'chatgpt'
    },
    {
      name: 'ChatGPT業務活用',
      description: 'ChatGPTを業務で活用した事例',
      query: 'ChatGPT 業務 min_faves:150 -is:retweet lang:ja',
      keywords: ['ChatGPT', '業務', '仕事', '効率化'],
      minLikes: 150,
      minRetweets: 25,
      category: 'chatgpt_business'
    },
    
    // 3. プロンプトエンジニアリング（要件を緩和）
    {
      name: 'プロンプト実践テクニック',
      description: 'ChatGPTやClaudeのプロンプトテクニック',
      query: 'プロンプト ChatGPT min_faves:200 -is:retweet lang:ja',
      keywords: ['プロンプト', 'ChatGPT', 'テクニック', 'コツ'],
      minLikes: 200,
      minRetweets: 30,
      category: 'prompt'
    },
    {
      name: 'プロンプト入門',
      description: 'プロンプトの基本的な書き方',
      query: 'プロンプト 書き方 min_faves:100 -is:retweet lang:ja',
      keywords: ['プロンプト', '書き方', '初心者', '入門'],
      minLikes: 100,
      minRetweets: 20,
      category: 'prompt_basic'
    },
    
    // 4. AI活用事例（より幅広く収集）
    {
      name: 'AI効率化事例',
      description: 'AIで効率化した具体例',
      query: 'AI 効率化 min_faves:300 -is:retweet lang:ja',
      keywords: ['AI', '効率化', '時間短縮', '改善'],
      minLikes: 300,
      minRetweets: 50,
      category: 'ai_efficiency'
    },
    {
      name: '生成AI活用',
      description: '生成AIの活用事例',
      query: '生成AI 活用 min_faves:200 -is:retweet lang:ja',
      keywords: ['生成AI', '活用', 'ChatGPT', 'Claude'],
      minLikes: 200,
      minRetweets: 30,
      category: 'generative_ai'
    },
    
    // 5. 開発者向けAI（要件を緩和）
    {
      name: 'Cursor実践活用',
      description: 'Cursor IDEの実践的な使い方',
      query: 'Cursor 開発 min_faves:50 -is:retweet lang:ja',
      keywords: ['Cursor', '開発', 'IDE', 'AI'],
      minLikes: 50,
      minRetweets: 10,
      category: 'cursor'
    },
    {
      name: 'GitHub Copilot活用',
      description: 'Copilotでの開発効率化',
      query: '"GitHub Copilot" min_faves:100 -is:retweet lang:ja',
      keywords: ['GitHub Copilot', 'コード', '開発', '効率化'],
      minLikes: 100,
      minRetweets: 20,
      category: 'copilot'
    },
    
    // 6. AI×ビジネス（現実的な数値に）
    {
      name: 'AI副業入門',
      description: 'AIを活用した副業の始め方',
      query: 'AI 副業 min_faves:300 -is:retweet lang:ja',
      keywords: ['AI', '副業', '始め方', '収入'],
      minLikes: 300,
      minRetweets: 50,
      category: 'ai_sidejob'
    },
    {
      name: 'AIビジネス活用',
      description: 'ビジネスでのAI活用事例',
      query: 'AI ビジネス 活用 min_faves:200 -is:retweet lang:ja',
      keywords: ['AI', 'ビジネス', '活用', '事例'],
      minLikes: 200,
      minRetweets: 30,
      category: 'ai_business'
    },
    
    // 7. クリエイティブAI（要件を緩和）
    {
      name: 'Midjourney作品',
      description: 'Midjourneyの作品と活用事例',
      query: 'Midjourney min_faves:300 -is:retweet lang:ja',
      keywords: ['Midjourney', '作品', 'AI画像', 'アート'],
      minLikes: 300,
      minRetweets: 50,
      category: 'midjourney'
    },
    {
      name: 'AI画像生成',
      description: 'AI画像生成ツールの活用',
      query: 'AI 画像生成 min_faves:200 -is:retweet lang:ja',
      keywords: ['AI', '画像生成', 'Stable Diffusion', 'DALL-E'],
      minLikes: 200,
      minRetweets: 30,
      category: 'ai_image'
    },
    
    // 8. 学習・教育
    {
      name: 'AI学習方法',
      description: 'AIの学習方法や教材',
      query: 'AI 学習 勉強 min_faves:100 -is:retweet lang:ja',
      keywords: ['AI', '学習', '勉強', '教材'],
      minLikes: 100,
      minRetweets: 20,
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
      console.log(`   最小いいね: ${created.minLikes} (クエリ内: min_faves:${created.query.match(/min_faves:(\d+)/)?.[1]})`);
      console.log(`   最小RT: ${created.minRetweets}\n`);
    }
    
    console.log(`\n合計 ${presets.length} 個のバランス調整プリセットを作成しました。`);
    console.log('\n調整内容:');
    console.log('- min_favesを100-300の範囲に調整（一部は50）');
    console.log('- より多くの良質な投稿を収集可能に');
    console.log('- カテゴリを細分化して精度向上');
    console.log('- 新規ツールや初心者向けコンテンツも収集');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBalancedPresets();