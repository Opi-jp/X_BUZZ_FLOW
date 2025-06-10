import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

// 主要なAI関連のニュースソース
const newsSources = [
  // 企業ブログ・公式サイト
  {
    name: 'Anthropic Blog',
    url: 'https://www.anthropic.com/index/rss.xml',
    type: 'RSS',
    category: 'AI Company',
  },
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    type: 'RSS',
    category: 'AI Company',
  },
  {
    name: 'Google AI Blog',
    url: 'https://ai.googleblog.com/feeds/posts/default',
    type: 'RSS',
    category: 'AI Company',
  },
  {
    name: 'DeepMind Blog',
    url: 'https://deepmind.com/blog/feed/basic/',
    type: 'RSS',
    category: 'AI Company',
  },
  {
    name: 'Microsoft AI Blog',
    url: 'https://blogs.microsoft.com/ai/feed/',
    type: 'RSS',
    category: 'AI Company',
  },
  
  // スタートアップ・VC
  {
    name: 'Y Combinator Blog',
    url: 'https://www.ycombinator.com/blog/rss',
    type: 'RSS',
    category: 'VC/Startup',
  },
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    type: 'RSS',
    category: 'AI Company',
  },
  
  // AI研究機関
  {
    name: 'MIT News - AI',
    url: 'https://news.mit.edu/rss/topic/artificial-intelligence',
    type: 'RSS',
    category: 'Research',
  },
  {
    name: 'Stanford AI Lab',
    url: 'https://ai.stanford.edu/blog/feed.xml',
    type: 'RSS',
    category: 'Research',
  },
  
  // テックメディア
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    type: 'RSS',
    category: 'Tech Media',
  },
  {
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/ai/feed/',
    type: 'RSS',
    category: 'Tech Media',
  },
  {
    name: 'The Verge AI',
    url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
    type: 'RSS',
    category: 'Tech Media',
  },
  
  // 日本のソース
  {
    name: 'AI新聞',
    url: 'https://aishinbun.com/feed/',
    type: 'RSS',
    category: 'JP Media',
  },
  
  // Twitter/Xアカウント（APIで収集）
  {
    name: 'Anthropic Twitter',
    url: 'https://twitter.com/AnthropicAI',
    type: 'TWITTER',
    category: 'AI Company',
  },
  {
    name: 'OpenAI Twitter',
    url: 'https://twitter.com/OpenAI',
    type: 'TWITTER',
    category: 'AI Company',
  },
  {
    name: 'Google AI Twitter',
    url: 'https://twitter.com/GoogleAI',
    type: 'TWITTER',
    category: 'AI Company',
  },
  {
    name: 'Y Combinator Twitter',
    url: 'https://twitter.com/ycombinator',
    type: 'TWITTER',
    category: 'VC/Startup',
  },
  {
    name: 'Sam Altman Twitter',
    url: 'https://twitter.com/sama',
    type: 'TWITTER',
    category: 'AI Leader',
  },
  {
    name: 'Dario Amodei Twitter',
    url: 'https://twitter.com/DarioAmodei',
    type: 'TWITTER',
    category: 'AI Leader',
  },
  {
    name: 'Yann LeCun Twitter',
    url: 'https://twitter.com/ylecun',
    type: 'TWITTER',
    category: 'AI Leader',
  },
  {
    name: 'Andrew Ng Twitter',
    url: 'https://twitter.com/AndrewYNg',
    type: 'TWITTER',
    category: 'AI Leader',
  },
  
  // NewsAPI（複数ソースから収集）
  {
    name: 'NewsAPI - AI',
    url: 'https://newsapi.org',
    type: 'API',
    category: 'News Aggregator',
  },
]

async function seed() {
  console.log('🌱 ニュースソースの登録を開始します...')
  
  for (const source of newsSources) {
    try {
      // 既存チェック
      const existing = await prisma.newsSource.findFirst({
        where: {
          OR: [
            { url: source.url },
            { name: source.name }
          ]
        }
      })
      
      if (!existing) {
        await prisma.newsSource.create({
          data: source
        })
        console.log(`✅ ${source.name} を登録しました`)
      } else {
        console.log(`⏭️  ${source.name} は既に存在します`)
      }
    } catch (error) {
      console.error(`❌ ${source.name} の登録に失敗:`, error)
    }
  }
  
  console.log('✨ ニュースソースの登録が完了しました！')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })