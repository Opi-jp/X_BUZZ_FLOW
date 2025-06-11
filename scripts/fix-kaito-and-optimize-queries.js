const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting Kaito API fix and query optimization...\n');

    // 1. Create optimized queries focused on AI + Creative + Work topics
    const optimizedPresets = [
      // Core AI + Creative Strategy
      {
        name: "AI×クリエイティブ戦略",
        query: "(AI OR ChatGPT OR Claude) AND (クリエイティブ OR デザイン OR 映像 OR アート) AND (活用 OR 使い方 OR 方法)",
        minLikes: 300,
        minRetweets: 50,
        category: "ai_creative_core",
        keywords: ["AI", "クリエイティブ", "デザイン", "活用", "戦略"]
      },
      {
        name: "LLM実践活用術",
        query: "(ChatGPT OR Claude OR GPT-4) AND (実際に OR 実践 OR 具体的) AND (使ってみた OR 活用)",
        minLikes: 500,
        minRetweets: 100,
        category: "llm_practice",
        keywords: ["LLM", "実践", "活用", "ChatGPT", "Claude"]
      },
      {
        name: "AI時代の働き方革命",
        query: "AI AND (働き方 OR キャリア OR 仕事) AND (変わる OR 新しい OR 未来)",
        minLikes: 400,
        minRetweets: 80,
        category: "ai_work_future",
        keywords: ["AI", "働き方", "未来", "変革", "キャリア"]
      },
      
      // High Impact Content
      {
        name: "バズAI活用事例",
        query: "(ChatGPT OR Claude) AND (すごい OR 衝撃 OR 驚き OR やばい) min_faves:1000",
        minLikes: 1000,
        minRetweets: 200,
        category: "viral_ai_cases",
        keywords: ["AI", "バズ", "衝撃", "事例"]
      },
      {
        name: "AI収益化成功例",
        query: "AI AND (稼ぐ OR 収益 OR 売上) AND (月 OR 年) AND (万 OR 億)",
        minLikes: 800,
        minRetweets: 150,
        category: "ai_monetization",
        keywords: ["AI", "収益化", "成功", "ビジネス"]
      },

      // Creative Professional Focus
      {
        name: "クリエイター×AI革新",
        query: "(クリエイター OR デザイナー OR 映像) AND AI AND (効率化 OR 革新 OR 新しい)",
        minLikes: 300,
        minRetweets: 50,
        category: "creator_ai_innovation",
        keywords: ["クリエイター", "AI", "革新", "効率化"]
      },
      {
        name: "AIアート＆デザイン",
        query: "(Midjourney OR \"Stable Diffusion\" OR DALL-E) AND (作品 OR デザイン OR アート) min_faves:500",
        minLikes: 500,
        minRetweets: 100,
        category: "ai_art_design",
        keywords: ["AIアート", "デザイン", "Midjourney", "創作"]
      },

      // Future of Work
      {
        name: "50代からのAI活用",
        query: "(50代 OR 40代 OR ミドル) AND AI AND (学ぶ OR 始める OR 活用)",
        minLikes: 200,
        minRetweets: 40,
        category: "midlife_ai",
        keywords: ["50代", "AI", "学習", "キャリア"]
      },
      {
        name: "セカンドキャリア×AI",
        query: "(セカンドキャリア OR 転職 OR 独立) AND AI AND (成功 OR 実現)",
        minLikes: 300,
        minRetweets: 60,
        category: "second_career_ai",
        keywords: ["セカンドキャリア", "AI", "転職", "独立"]
      },

      // Practical Implementation
      {
        name: "今すぐ使えるAI術",
        query: "(今すぐ OR すぐに OR 簡単) AND (ChatGPT OR Claude) AND (使える OR できる)",
        minLikes: 400,
        minRetweets: 80,
        category: "instant_ai_tips",
        keywords: ["今すぐ", "簡単", "AI", "実践"]
      },
      {
        name: "プロンプト実戦術",
        query: "プロンプト AND (コツ OR テクニック OR 書き方) AND (効果 OR 結果)",
        minLikes: 300,
        minRetweets: 60,
        category: "prompt_tactics",
        keywords: ["プロンプト", "テクニック", "実戦", "効果"]
      },

      // Trend & News
      {
        name: "AI最新トレンド",
        query: "(最新 OR 新しい OR リリース) AND (AI OR ChatGPT OR Claude) AND (機能 OR アップデート)",
        minLikes: 200,
        minRetweets: 40,
        category: "ai_trends",
        keywords: ["最新", "AI", "トレンド", "アップデート"]
      },
      {
        name: "AI業界動向",
        query: "(OpenAI OR Anthropic OR Google) AND (発表 OR リリース OR 新機能)",
        minLikes: 300,
        minRetweets: 60,
        category: "ai_industry_news",
        keywords: ["業界", "AI", "ニュース", "動向"]
      }
    ];

    // Deactivate all existing presets
    await prisma.collectionPreset.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    console.log('✓ Deactivated all existing presets');

    // Create new optimized presets
    for (const preset of optimizedPresets) {
      await prisma.collectionPreset.create({
        data: {
          ...preset,
          language: 'ja',
          isActive: true
        }
      });
      console.log(`✓ Created preset: ${preset.name}`);
    }

    console.log('\nAll presets have been optimized for AI + Creative + Work focus!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();