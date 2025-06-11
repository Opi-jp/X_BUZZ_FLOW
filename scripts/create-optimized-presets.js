const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createOptimizedPresets() {
  console.log('=== 最適化されたバズツイート収集プリセット作成 ===\n');
  console.log('テスト結果に基づいて調整済み\n');
  
  const presets = [
    // 1. Claude関連（良い結果が出た）
    {
      name: 'Claude実践活用',
      description: 'Claudeの実践的な活用事例と使い方',
      query: 'Claude 使い方 min_faves:500 -is:retweet lang:ja',
      keywords: ['Claude', '使い方', 'AI活用', 'システムプロンプト'],
      minLikes: 500,
      minRetweets: 100,
      category: 'claude'
    },
    {
      name: 'Claude Code活用',
      description: 'Claude Codeの具体的な活用方法',
      query: '"Claude Code" min_faves:300 -is:retweet lang:ja',
      keywords: ['Claude Code', 'KDDI', '開発', 'AI'],
      minLikes: 300,
      minRetweets: 50,
      category: 'claude_code'
    },
    
    // 2. プロンプトエンジニアリング（良い結果が出た）
    {
      name: 'プロンプト実践テクニック',
      description: 'ChatGPTやClaudeのプロンプトテクニック',
      query: 'プロンプト ChatGPT min_faves:800 -is:retweet lang:ja',
      keywords: ['プロンプト', 'ChatGPT', 'o3', 'テクニック'],
      minLikes: 800,
      minRetweets: 150,
      category: 'prompt'
    },
    {
      name: 'AIプロンプト設計',
      description: 'プロンプトエンジニアリングの実践',
      query: 'プロンプト 書き方 AI min_faves:500 -is:retweet lang:ja',
      keywords: ['プロンプト', '書き方', 'コツ', 'AI'],
      minLikes: 500,
      minRetweets: 100,
      category: 'prompt_design'
    },
    
    // 3. AI活用事例（具体的な成果）
    {
      name: 'AI業務効率化事例',
      description: 'AIで業務を効率化した具体例',
      query: 'AI 効率化 時間 min_faves:1000 -is:retweet lang:ja',
      keywords: ['AI', '効率化', '時間削減', '業務改善'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'ai_efficiency'
    },
    {
      name: 'ChatGPT活用成果',
      description: 'ChatGPTで成果を出した事例',
      query: 'ChatGPT 作成 時間 min_faves:800 -is:retweet lang:ja',
      keywords: ['ChatGPT', '作成', '自動化', '成果'],
      minLikes: 800,
      minRetweets: 150,
      category: 'chatgpt_results'
    },
    
    // 4. 開発者向けAI
    {
      name: 'Cursor実践活用',
      description: 'Cursor IDEの実践的な使い方',
      query: 'Cursor 開発 min_faves:300 -is:retweet lang:ja',
      keywords: ['Cursor', '開発', 'IDE', 'AI'],
      minLikes: 300,
      minRetweets: 50,
      category: 'cursor'
    },
    {
      name: 'GitHub Copilot活用',
      description: 'Copilotでの開発効率化',
      query: '"GitHub Copilot" コード min_faves:400 -is:retweet lang:ja',
      keywords: ['GitHub Copilot', 'コード', '開発', '効率化'],
      minLikes: 400,
      minRetweets: 80,
      category: 'copilot'
    },
    
    // 5. AI×ビジネス
    {
      name: 'AI副業・収益化',
      description: 'AIを活用した副業や収益化の実例',
      query: 'AI 副業 月 万円 min_faves:1500 -is:retweet lang:ja',
      keywords: ['AI', '副業', '収益', '月収'],
      minLikes: 1500,
      minRetweets: 300,
      category: 'ai_income'
    },
    {
      name: 'AIマーケティング',
      description: 'AIを活用したマーケティング事例',
      query: 'AI マーケティング 成果 min_faves:800 -is:retweet lang:ja',
      keywords: ['AI', 'マーケティング', '集客', '売上'],
      minLikes: 800,
      minRetweets: 150,
      category: 'ai_marketing'
    },
    
    // 6. クリエイティブAI
    {
      name: 'Midjourney作品',
      description: 'Midjourneyの作品と活用事例',
      query: 'Midjourney 作品 min_faves:1000 -is:retweet lang:ja',
      keywords: ['Midjourney', '作品', 'AI画像', 'クリエイティブ'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'midjourney'
    },
    {
      name: 'AI動画制作',
      description: 'AIを使った動画制作の事例',
      query: 'AI 動画 Runway min_faves:800 -is:retweet lang:ja',
      keywords: ['AI', '動画', 'Runway', '映像制作'],
      minLikes: 800,
      minRetweets: 150,
      category: 'ai_video'
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
      console.log(`   カテゴリ: ${created.category}`);
      console.log(`   最小いいね: ${created.minLikes}`);
      console.log(`   最小RT: ${created.minRetweets}\n`);
    }
    
    console.log(`\n合計 ${presets.length} 個の最適化プリセットを作成しました。`);
    console.log('\n改善点:');
    console.log('- テストで良い結果が出たクエリパターンを採用');
    console.log('- より具体的なキーワードの組み合わせ');
    console.log('- 適切な最小エンゲージメント設定');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createOptimizedPresets();