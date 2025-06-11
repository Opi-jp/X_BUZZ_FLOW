const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createBuzzPresets() {
  console.log('=== バズツイート収集プリセット作成 ===\n');
  
  const presets = [
    // AI/LLM関連（メインターゲット）
    {
      name: 'AI・生成AI トレンド',
      description: '生成AI、ChatGPT、Claude等の最新トレンド',
      query: '(生成AI OR ChatGPT OR Claude OR Gemini OR GPT-4) -is:retweet',
      keywords: ['生成AI', 'ChatGPT', 'Claude', 'Gemini', 'GPT-4', 'LLM', 'プロンプト'],
      minLikes: 300,
      minRetweets: 50,
      category: 'ai_trend'
    },
    {
      name: 'AIツール活用術',
      description: 'AI活用の具体的な事例・ノウハウ',
      query: '(ChatGPT 使い方 OR AI 活用 OR 生成AI 仕事) -is:retweet',
      keywords: ['使い方', '活用', '効率化', '自動化', 'プロンプトエンジニアリング'],
      minLikes: 500,
      minRetweets: 100,
      category: 'ai_usage'
    },
    {
      name: 'AI×クリエイティブ',
      description: 'AIとクリエイティブ業界の融合',
      query: '(AI クリエイティブ OR 生成AI デザイン OR AI 映像) -is:retweet',
      keywords: ['クリエイティブ', 'デザイン', '映像', 'アート', 'Midjourney', 'Stable Diffusion'],
      minLikes: 300,
      minRetweets: 50,
      category: 'ai_creative'
    },
    
    // 働き方・未来予測関連
    {
      name: '働き方の未来',
      description: 'AI時代の働き方、キャリア論',
      query: '(AI 働き方 OR 生成AI 仕事 OR リモートワーク) -is:retweet',
      keywords: ['働き方', 'リモートワーク', 'フリーランス', '副業', 'キャリア'],
      minLikes: 500,
      minRetweets: 100,
      category: 'future_work'
    },
    {
      name: '異常値系バズ投稿',
      description: '具体的数値で驚きを与える投稿',
      query: '(月収 万円 OR 売上 億 OR フォロワー 万人) -is:retweet',
      keywords: ['月収', '年収', '売上', 'フォロワー', '万円', '億円'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'anomaly'
    },
    
    // エンゲージメント獲得用
    {
      name: '自分語り誘発投稿',
      description: '学歴・職歴・資産など議論を呼ぶテーマ',
      query: '(学歴 OR 年収 OR 転職 OR 起業) -is:retweet',
      keywords: ['学歴', '年収', '転職', '起業', '独立', 'フリーランス'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'self_story'
    },
    {
      name: 'X運用ノウハウ',
      description: 'X(Twitter)の運用術、バズり方',
      query: '(X運用 OR Twitter運用 OR バズ OR インプレッション) -is:retweet',
      keywords: ['X運用', 'Twitter運用', 'バズ', 'インプレッション', 'フォロワー'],
      minLikes: 500,
      minRetweets: 100,
      category: 'x_operation'
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

createBuzzPresets();