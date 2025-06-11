const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function createAutoManualPresets() {
  try {
    console.log('自動化用と手動用のプリセットを整理...\n');
    
    // 既存のプリセットをすべて非アクティブ化
    await prisma.collectionPreset.updateMany({
      data: { isActive: false }
    });
    
    // 自動化用のコアプリセット（毎朝自動実行）
    const autoPresets = [
      {
        name: '【自動】AI×クリエイティブ',
        description: '毎朝自動収集：AIとクリエイティブの高エンゲージメント投稿',
        query: 'AI クリエイティブ',
        category: 'auto_ai_creative',
        keywords: ['AI', 'クリエイティブ'],
        minLikes: 1000,
        minRetweets: 100,
        isActive: true
      },
      {
        name: '【自動】AI働き方',
        description: '毎朝自動収集：AIで変わる働き方の話題',
        query: 'AI 働き方',
        category: 'auto_ai_work',
        keywords: ['AI', '働き方'],
        minLikes: 1500,
        minRetweets: 200,
        isActive: true
      },
      {
        name: '【自動】LLM実践',
        description: '毎朝自動収集：ChatGPT/Claudeの実践例',
        query: 'ChatGPT OR Claude 活用',
        category: 'auto_llm_practice',
        keywords: ['ChatGPT', 'Claude', '活用'],
        minLikes: 2000,
        minRetweets: 300,
        isActive: true
      }
    ];
    
    // 手動用の詳細プリセット（必要に応じて手動実行）
    const manualPresets = [
      // プロンプト関連
      {
        name: '【手動】プロンプトテクニック',
        description: '高度なプロンプトテクニックの共有',
        query: 'プロンプト テクニック',
        category: 'manual_prompt_tech',
        keywords: ['プロンプト', 'テクニック'],
        minLikes: 500,
        minRetweets: 50,
        isActive: false
      },
      {
        name: '【手動】プロンプトエンジニアリング',
        description: 'プロンプトエンジニアリング実践',
        query: 'プロンプトエンジニアリング',
        category: 'manual_prompt_eng',
        keywords: ['プロンプトエンジニアリング'],
        minLikes: 300,
        minRetweets: 30,
        isActive: false
      },
      
      // 特定ツール
      {
        name: '【手動】Claude Code',
        description: 'Claude Codeの活用事例',
        query: '"Claude Code"',
        category: 'manual_claude_code',
        keywords: ['Claude Code'],
        minLikes: 100,
        minRetweets: 20,
        isActive: false
      },
      {
        name: '【手動】Cursor IDE',
        description: 'Cursor IDEの実践例',
        query: 'Cursor 開発',
        category: 'manual_cursor',
        keywords: ['Cursor', 'IDE'],
        minLikes: 200,
        minRetweets: 30,
        isActive: false
      },
      
      // 世代・キャリア
      {
        name: '【手動】50代AI活用',
        description: '50代のAI活用事例',
        query: '50代 AI',
        category: 'manual_senior_ai',
        keywords: ['50代', 'AI'],
        minLikes: 300,
        minRetweets: 50,
        isActive: false
      },
      {
        name: '【手動】セカンドキャリア',
        description: 'AIを活用したセカンドキャリア',
        query: 'セカンドキャリア AI',
        category: 'manual_second_career',
        keywords: ['セカンドキャリア', 'AI'],
        minLikes: 400,
        minRetweets: 60,
        isActive: false
      },
      
      // 収益化・ビジネス
      {
        name: '【手動】AI副業',
        description: 'AIを使った副業の実例',
        query: 'AI 副業',
        category: 'manual_ai_sidejob',
        keywords: ['AI', '副業'],
        minLikes: 800,
        minRetweets: 100,
        isActive: false
      },
      {
        name: '【手動】AI収益化',
        description: 'AIツールで収益化した事例',
        query: 'AI 収益化',
        category: 'manual_ai_monetize',
        keywords: ['AI', '収益化'],
        minLikes: 1000,
        minRetweets: 150,
        isActive: false
      },
      
      // トレンド・ニュース
      {
        name: '【手動】AI最新情報',
        description: '最新のAI関連ニュース',
        query: 'AI 最新',
        category: 'manual_ai_news',
        keywords: ['AI', '最新'],
        minLikes: 500,
        minRetweets: 80,
        isActive: false
      },
      {
        name: '【手動】バズAI事例',
        description: '特にバズったAI活用事例',
        query: 'AI 衝撃',
        category: 'manual_viral_ai',
        keywords: ['AI', '衝撃', 'バズ'],
        minLikes: 3000,
        minRetweets: 500,
        isActive: false
      }
    ];
    
    // プリセットを作成
    console.log('=== 自動化用プリセット（毎朝実行） ===\n');
    for (const preset of autoPresets) {
      await prisma.collectionPreset.create({
        data: {
          ...preset,
          language: 'ja'
        }
      });
      console.log(`✅ ${preset.name}`);
      console.log(`   ${preset.description}`);
    }
    
    console.log('\n=== 手動用プリセット（必要時に実行） ===\n');
    for (const preset of manualPresets) {
      await prisma.collectionPreset.create({
        data: {
          ...preset,
          language: 'ja'
        }
      });
      console.log(`📌 ${preset.name}`);
      console.log(`   ${preset.description}`);
    }
    
    console.log('\n完了！');
    console.log('- 自動化用: 3個（アクティブ）');
    console.log('- 手動用: 10個（非アクティブ）');
    console.log('\n自動化用は毎朝自動で実行され、手動用は必要に応じて個別に実行できます。');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAutoManualPresets();