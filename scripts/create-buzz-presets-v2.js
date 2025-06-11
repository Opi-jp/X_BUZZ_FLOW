const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createBuzzPresetsV2() {
  console.log('=== バズツイート収集プリセットV2作成 ===\n');
  
  const presets = [
    // AI関連（具体的なツール名必須）
    {
      name: 'ChatGPT実践活用',
      description: 'ChatGPTの具体的な活用事例',
      query: 'ChatGPT (プロンプト OR 使い方 OR 活用) min_faves:500 -is:retweet -選挙 -政治 -中国 -韓国 -税金',
      keywords: ['ChatGPT', 'プロンプト', 'AI活用'],
      minLikes: 500,
      minRetweets: 100,
      category: 'chatgpt'
    },
    {
      name: 'Claude活用事例',
      description: 'Claudeの具体的な活用事例',
      query: 'Claude (使い方 OR 活用 OR プロンプト OR API) min_faves:300 -is:retweet -選挙 -政治',
      keywords: ['Claude', 'Anthropic', 'AI活用'],
      minLikes: 300,
      minRetweets: 50,
      category: 'claude'
    },
    {
      name: '生成AI業務活用',
      description: '業務での生成AI活用具体例',
      query: '(ChatGPT OR Claude OR Gemini) (業務 OR 仕事 OR ビジネス) (効率化 OR 自動化 OR 改善) min_faves:500 -is:retweet -選挙 -政治 -試してみた',
      keywords: ['生成AI', '業務効率化', 'ビジネス活用'],
      minLikes: 500,
      minRetweets: 100,
      category: 'ai_business'
    },
    
    // 開発・プログラミング関連
    {
      name: 'GitHub Copilot活用',
      description: 'コード生成AIの活用事例',
      query: '"GitHub Copilot" (使い方 OR 効率 OR 便利 OR すごい) min_faves:300 -is:retweet',
      keywords: ['GitHub Copilot', 'コード生成', '開発効率化'],
      minLikes: 300,
      minRetweets: 50,
      category: 'copilot'
    },
    {
      name: 'Cursor実践',
      description: 'Cursor IDEの活用事例',
      query: 'Cursor (エディタ OR IDE OR 使い方 OR 効率) min_faves:200 -is:retweet',
      keywords: ['Cursor', 'AI開発', 'IDE'],
      minLikes: 200,
      minRetweets: 30,
      category: 'cursor'
    },
    
    // 具体的な成果・数値系
    {
      name: '劇的な効率化事例',
      description: '具体的な数値を含む効率化成功事例',
      query: '(ChatGPT OR AI OR 自動化) (時間 (90% OR 80% OR 10倍 OR 5倍) 削減) min_faves:1000 -is:retweet',
      keywords: ['効率化', '時間削減', '自動化'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'efficiency'
    },
    {
      name: '収益化成功事例',
      description: 'AI活用での収益化成功例',
      query: '(AI OR ChatGPT OR 自動化) (月収 OR 売上 OR 収益) (万円 OR 百万) min_faves:1000 -is:retweet -プレゼント -懸賞',
      keywords: ['収益化', 'マネタイズ', 'ビジネス'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'monetization'
    },
    
    // プロンプトエンジニアリング
    {
      name: 'プロンプトテクニック',
      description: '効果的なプロンプトの書き方',
      query: '(プロンプト OR prompt) (テクニック OR コツ OR 書き方 OR テンプレート) min_faves:500 -is:retweet',
      keywords: ['プロンプト', 'プロンプトエンジニアリング', 'テクニック'],
      minLikes: 500,
      minRetweets: 100,
      category: 'prompt'
    },
    
    // 未来の働き方（具体的）
    {
      name: 'AIエンジニア転職',
      description: 'AI関連職への転職・キャリアチェンジ',
      query: '(AIエンジニア OR 機械学習エンジニア OR データサイエンティスト) (転職 OR なった OR 年収) min_faves:500 -is:retweet',
      keywords: ['AIエンジニア', '転職', 'キャリアチェンジ'],
      minLikes: 500,
      minRetweets: 100,
      category: 'ai_career'
    },
    {
      name: 'リスキリング実践',
      description: '実際のスキル習得体験談',
      query: '(Python OR プログラミング OR AI) (勉強 OR 学習 OR 習得) (3ヶ月 OR 6ヶ月 OR 1年) min_faves:500 -is:retweet',
      keywords: ['リスキリング', '学習', 'スキルアップ'],
      minLikes: 500,
      minRetweets: 100,
      category: 'reskilling'
    },
    
    // X運用・発信術
    {
      name: 'X AI活用術',
      description: 'X(Twitter)でのAI活用',
      query: '(X OR Twitter) (ChatGPT OR AI) (投稿 OR ツイート OR 運用) min_faves:500 -is:retweet -フォロバ',
      keywords: ['X運用', 'AI活用', 'SNS'],
      minLikes: 500,
      minRetweets: 100,
      category: 'x_ai'
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
    
    console.log(`\n合計 ${presets.length} 個のプリセットを作成しました。`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBuzzPresetsV2();