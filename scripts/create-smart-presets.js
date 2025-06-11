const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createSmartPresets() {
  console.log('=== スマートバズツイート収集プリセット作成 ===\n');
  console.log('方針: ターゲットを明確にし、ノイズを最小化する\n');
  
  const presets = [
    // 1. 実用的なAI活用（具体的な成果を含む）
    {
      name: 'AI活用の具体的成果',
      description: 'AIツールで実際に成果を出した事例',
      query: '(ChatGPT OR Claude) AND (作った OR 作成 OR 構築 OR 開発 OR 書いた) AND (時間 OR 効率 OR 成果) -is:retweet lang:ja',
      keywords: ['ChatGPT', 'Claude', '成果', '効率化'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'ai_results'
    },
    
    // 2. プログラミング×AI（開発者向け）
    {
      name: 'エンジニアのAI活用',
      description: 'エンジニアによるAIツール活用事例',
      query: '(Copilot OR Cursor OR ChatGPT) AND (コード OR プログラミング OR 開発) AND (効率 OR 時短 OR 便利) -is:retweet lang:ja',
      keywords: ['Copilot', 'Cursor', '開発効率化'],
      minLikes: 500,
      minRetweets: 100,
      category: 'dev_ai'
    },
    
    // 3. ビジネス×AI（経営者・マネージャー向け）
    {
      name: 'ビジネスでのAI実践',
      description: '経営や業務でのAI活用実例',
      query: '(ChatGPT OR AI) AND (売上 OR 業務 OR 経営 OR マーケティング) AND (改善 OR 向上 OR 効率) -is:retweet -懸賞 lang:ja',
      keywords: ['ビジネス', 'AI活用', '業務改善'],
      minLikes: 800,
      minRetweets: 150,
      category: 'business_ai'
    },
    
    // 4. クリエイティブ×AI（デザイナー・クリエイター向け）
    {
      name: 'クリエイティブAI活用',
      description: 'デザインや映像制作でのAI活用',
      query: '(Midjourney OR "Stable Diffusion" OR DALL-E OR Runway) AND (作品 OR デザイン OR 映像 OR 制作) -is:retweet lang:ja',
      keywords: ['Midjourney', 'Stable Diffusion', 'クリエイティブ'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'creative_ai'
    },
    
    // 5. プロンプトエンジニアリング（実践的）
    {
      name: 'プロンプト実践テクニック',
      description: '実際に使えるプロンプトテクニック',
      query: '(プロンプト OR prompt) AND (テクニック OR 方法 OR コツ) AND (ChatGPT OR Claude) -is:retweet lang:ja',
      keywords: ['プロンプト', 'テクニック', '実践'],
      minLikes: 800,
      minRetweets: 150,
      category: 'prompt_eng'
    },
    
    // 6. AI副業・独立（実績あり）
    {
      name: 'AI活用の副業実績',
      description: 'AIを使った副業や独立の実例',
      query: '(ChatGPT OR AI) AND (副業 OR フリーランス OR 独立) AND (月 AND (万円 OR 収入 OR 売上)) -is:retweet -懸賞 lang:ja',
      keywords: ['副業', 'フリーランス', 'AI収益化'],
      minLikes: 1500,
      minRetweets: 300,
      category: 'ai_income'
    },
    
    // 7. AIツール比較・レビュー
    {
      name: 'AIツール徹底比較',
      description: '実際に使ったAIツールの比較',
      query: '(ChatGPT OR Claude OR Gemini OR Perplexity) AND (比較 OR レビュー OR 使ってみた) AND (良い OR 便利 OR おすすめ) -is:retweet lang:ja',
      keywords: ['AIツール', '比較', 'レビュー'],
      minLikes: 500,
      minRetweets: 100,
      category: 'ai_review'
    },
    
    // 8. AI学習・スキルアップ（実体験）
    {
      name: 'AI学習の実体験',
      description: 'AI関連スキルの学習体験談',
      query: '(Python OR 機械学習 OR "プロンプトエンジニアリング") AND (勉強 OR 学習 OR 習得) AND (ヶ月 OR 週間) -is:retweet lang:ja',
      keywords: ['AI学習', 'スキルアップ', 'Python'],
      minLikes: 800,
      minRetweets: 150,
      category: 'ai_learning'
    },
    
    // 9. 次世代の働き方（具体例）
    {
      name: '新しい働き方の実例',
      description: 'AIを活用した新しい働き方',
      query: '(リモート OR 週休3日 OR 4日勤務) AND (導入 OR 実践 OR 実現) AND (生産性 OR 効率) -is:retweet lang:ja',
      keywords: ['新しい働き方', 'リモートワーク', '生産性'],
      minLikes: 1000,
      minRetweets: 200,
      category: 'future_work'
    },
    
    // 10. AIニュース・トレンド（信頼できる発信者）
    {
      name: 'AI最新トレンド',
      description: '信頼できる発信者からのAI情報',
      query: '(OpenAI OR Anthropic OR Google) AND (発表 OR リリース OR アップデート) AND (新機能 OR 新モデル) -is:retweet lang:ja',
      keywords: ['AIニュース', 'トレンド', '最新情報'],
      minLikes: 2000,
      minRetweets: 400,
      category: 'ai_news'
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
      console.log(`   クエリ: ${created.query.substring(0, 60)}...`);
      console.log(`   最小いいね: ${created.minLikes}`);
      console.log(`   最小RT: ${created.minRetweets}\n`);
    }
    
    console.log(`\n合計 ${presets.length} 個のスマートプリセットを作成しました。`);
    console.log('\n特徴:');
    console.log('- AND条件で明確なターゲティング');
    console.log('- lang:jaで日本語投稿のみ');
    console.log('- 具体的な成果や数値を含む投稿を重視');
    console.log('- カテゴリごとに適切な最小エンゲージメント設定');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSmartPresets();