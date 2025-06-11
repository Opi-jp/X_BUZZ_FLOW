const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createWorkChangePresets() {
  console.log('=== AIによる働き方変化収集プリセット追加 ===\n');
  
  const workChangePresets = [
    // ビフォーアフター系
    {
      name: '働き方ビフォーアフター',
      description: 'AIツール導入前後の変化',
      query: '"以前は" "今は" (AI OR ChatGPT OR ツール) min_faves:100 -is:retweet lang:ja',
      keywords: ['以前は', '今は', 'AI', '変化'],
      minLikes: 100,
      minRetweets: 20,
      category: 'work_before_after'
    },
    {
      name: '劇的時短事例',
      description: '作業時間が劇的に短縮した事例',
      query: '時間 (かかってた OR かかっていた) (分で OR 30分 OR 1時間) 完了 min_faves:150 -is:retweet lang:ja',
      keywords: ['時間短縮', '効率化', '時短'],
      minLikes: 150,
      minRetweets: 25,
      category: 'time_reduction'
    },
    
    // キャリア変化系
    {
      name: 'AIでキャリアチェンジ',
      description: 'AI活用によるキャリア変化',
      query: '(転職 OR 独立 OR フリーランス) AI (活用 OR 使って) min_faves:200 -is:retweet lang:ja',
      keywords: ['転職', '独立', 'フリーランス', 'AI'],
      minLikes: 200,
      minRetweets: 30,
      category: 'career_change'
    },
    {
      name: 'AI時代の新職業',
      description: 'AIで生まれた新しい職業・役割',
      query: '(プロンプトエンジニア OR AIコンサル OR AI講師) (なった OR 始めた) min_faves:100 -is:retweet lang:ja',
      keywords: ['プロンプトエンジニア', 'AIコンサル', '新職業'],
      minLikes: 100,
      minRetweets: 20,
      category: 'new_jobs'
    },
    
    // 収入・成果系
    {
      name: 'AI副業で収入UP',
      description: 'AIを活用した副業の収入事例',
      query: 'AI 副業 月 (10万 OR 20万 OR 30万) min_faves:300 -is:retweet lang:ja',
      keywords: ['AI', '副業', '収入', '月収'],
      minLikes: 300,
      minRetweets: 50,
      category: 'ai_side_income'
    },
    {
      name: '売上・業績向上',
      description: 'AI導入による売上・業績向上',
      query: '(売上 OR 業績) (倍 OR 2倍 OR 向上) AI 導入 min_faves:200 -is:retweet lang:ja',
      keywords: ['売上', '業績', 'AI導入', '向上'],
      minLikes: 200,
      minRetweets: 30,
      category: 'business_growth'
    },
    
    // 働き方の柔軟化
    {
      name: '新しいワークスタイル',
      description: 'AIが可能にした柔軟な働き方',
      query: '(週3勤務 OR 週4勤務 OR フルリモート) 実現 min_faves:150 -is:retweet lang:ja',
      keywords: ['週3勤務', '週4勤務', 'リモート', 'ワークスタイル'],
      minLikes: 150,
      minRetweets: 25,
      category: 'flexible_work'
    },
    {
      name: 'ノマド×AI',
      description: 'AIツールで実現するノマドワーク',
      query: '(ノマド OR 海外 OR 旅) 働き方 (AI OR ツール) min_faves:100 -is:retweet lang:ja',
      keywords: ['ノマド', '海外', 'リモート', 'AI'],
      minLikes: 100,
      minRetweets: 20,
      category: 'nomad_ai'
    },
    
    // スキル・学習系
    {
      name: 'AIスキル習得',
      description: 'AI関連スキルの習得体験',
      query: '(AI OR ChatGPT) (勉強 OR 学習) (身につけ OR マスター) min_faves:150 -is:retweet lang:ja',
      keywords: ['AI', '学習', 'スキル', '習得'],
      minLikes: 150,
      minRetweets: 25,
      category: 'ai_skill_learning'
    },
    {
      name: '必要スキルの変化',
      description: 'AI時代に必要なスキルの変化',
      query: '(必要なスキル OR 求められる) 変わった AI時代 min_faves:100 -is:retweet lang:ja',
      keywords: ['スキル', '変化', 'AI時代', '必要'],
      minLikes: 100,
      minRetweets: 20,
      category: 'skill_shift'
    },
    
    // 組織・チーム系
    {
      name: '組織のAI変革',
      description: '組織やチームのAI導入事例',
      query: '(会社 OR チーム OR 組織) AI導入 (変わった OR 効率) min_faves:150 -is:retweet lang:ja',
      keywords: ['組織', 'AI導入', '変革', 'チーム'],
      minLikes: 150,
      minRetweets: 25,
      category: 'org_transformation'
    },
    {
      name: 'AI×少人数経営',
      description: 'AIで少人数での事業運営',
      query: '(一人で OR 少人数) (会社 OR 事業) AI 運営 min_faves:200 -is:retweet lang:ja',
      keywords: ['一人', '少人数', 'AI', '経営'],
      minLikes: 200,
      minRetweets: 30,
      category: 'small_team_ai'
    }
  ];
  
  try {
    console.log('働き方変化プリセットを追加中...\n');
    
    for (const preset of workChangePresets) {
      const existing = await prisma.collectionPreset.findFirst({
        where: { category: preset.category }
      });
      
      if (!existing) {
        const created = await prisma.collectionPreset.create({
          data: preset
        });
        console.log(`✅ 追加: ${created.name}`);
        console.log(`   クエリ: ${created.query.substring(0, 50)}...`);
        console.log(`   最小いいね: ${created.minLikes}\n`);
      }
    }
    
    const totalCount = await prisma.collectionPreset.count();
    console.log(`\n合計 ${totalCount} 個のプリセットが登録されています。`);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createWorkChangePresets();