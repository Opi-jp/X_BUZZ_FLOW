import { PrismaClient } from '../app/generated/prisma'

const prisma = new PrismaClient()

async function seedAllSources() {
  const sources = [
    // 企業ブログ・公式
    { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', type: 'RSS', category: 'Company' },
    { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss.xml', type: 'RSS', category: 'Company' },
    { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss', type: 'RSS', category: 'Company' },
    { name: 'DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/', type: 'RSS', category: 'Company' },
    { name: 'Microsoft AI Blog', url: 'https://blogs.microsoft.com/ai/feed/', type: 'RSS', category: 'Company' },
    { name: 'Meta AI Blog', url: 'https://ai.facebook.com/blog/rss', type: 'RSS', category: 'Company' },
    { name: 'NVIDIA AI Blog', url: 'https://blogs.nvidia.com/blog/category/deep-learning/feed/', type: 'RSS', category: 'Company' },
    { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', type: 'RSS', category: 'Company' },
    
    // 研究機関
    { name: 'MIT News - AI', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2', type: 'RSS', category: 'Research' },
    { name: 'Stanford AI Lab', url: 'https://ai.stanford.edu/blog/feed.xml', type: 'RSS', category: 'Research' },
    { name: 'Berkeley AI Research', url: 'https://bair.berkeley.edu/blog/feed.xml', type: 'RSS', category: 'Research' },
    { name: 'Carnegie Mellon AI', url: 'https://www.cmu.edu/news/feeds/ai.rss', type: 'RSS', category: 'Research' },
    
    // テックメディア（英語）
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', type: 'RSS', category: 'Media' },
    { name: 'VentureBeat AI', url: 'https://venturebeat.com/ai/feed/', type: 'RSS', category: 'Media' },
    { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', type: 'RSS', category: 'Media' },
    { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', type: 'RSS', category: 'Media' },
    { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', type: 'RSS', category: 'Media' },
    { name: 'ArsTechnica AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', type: 'RSS', category: 'Media' },
    
    // 日本のテックメディア
    { name: 'ITmedia AI+', url: 'https://rss.itmedia.co.jp/rss/2.0/aiplus.xml', type: 'RSS', category: 'JP Media' },
    { name: 'GIGAZINE', url: 'https://gigazine.net/news/rss_2.0', type: 'RSS', category: 'JP Media' },
    { name: 'AI新聞', url: 'https://aishinbun.com/feed/', type: 'RSS', category: 'JP Media' },
    { name: 'AINOW', url: 'https://ainow.ai/feed/', type: 'RSS', category: 'JP Media' },
    { name: 'Ledge.ai', url: 'https://ledge.ai/feed/', type: 'RSS', category: 'JP Media' },
    
    // Twitter/Xアカウント（影響力のある人物・組織）
    { name: '@AnthropicAI', url: 'https://twitter.com/AnthropicAI', type: 'TWITTER', category: 'Company Twitter' },
    { name: '@OpenAI', url: 'https://twitter.com/OpenAI', type: 'TWITTER', category: 'Company Twitter' },
    { name: '@GoogleAI', url: 'https://twitter.com/GoogleAI', type: 'TWITTER', category: 'Company Twitter' },
    { name: '@DeepMind', url: 'https://twitter.com/DeepMind', type: 'TWITTER', category: 'Company Twitter' },
    { name: '@MSFTResearch', url: 'https://twitter.com/MSFTResearch', type: 'TWITTER', category: 'Company Twitter' },
    
    // AI研究者・インフルエンサー
    { name: '@sama', url: 'https://twitter.com/sama', type: 'TWITTER', category: 'Influencer' },
    { name: '@DarioAmodei', url: 'https://twitter.com/DarioAmodei', type: 'TWITTER', category: 'Influencer' },
    { name: '@ylecun', url: 'https://twitter.com/ylecun', type: 'TWITTER', category: 'Influencer' },
    { name: '@AndrewYNg', url: 'https://twitter.com/AndrewYNg', type: 'TWITTER', category: 'Influencer' },
    { name: '@GaryMarcus', url: 'https://twitter.com/GaryMarcus', type: 'TWITTER', category: 'Influencer' },
    { name: '@emollick', url: 'https://twitter.com/emollick', type: 'TWITTER', category: 'Influencer' },
    { name: '@svpino', url: 'https://twitter.com/svpino', type: 'TWITTER', category: 'Influencer' },
    
    // ニュースアグリゲーター
    { name: 'Hacker News AI', url: 'https://hnrss.org/newest?q=AI+OR+ChatGPT+OR+LLM', type: 'RSS', category: 'Aggregator' },
    { name: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', type: 'RSS', category: 'Aggregator' },
    { name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', type: 'RSS', category: 'Aggregator' },
  ]

  console.log(`Seeding ${sources.length} news sources...`)

  let created = 0
  let skipped = 0

  for (const source of sources) {
    try {
      const existing = await prisma.newsSource.findFirst({
        where: { url: source.url }
      })

      if (!existing) {
        await prisma.newsSource.create({
          data: {
            ...source,
            active: true,
          }
        })
        created++
        console.log(`✓ Created: ${source.name}`)
      } else {
        skipped++
        console.log(`- Skipped: ${source.name} (already exists)`)
      }
    } catch (error) {
      console.error(`✗ Error creating ${source.name}:`, error)
    }
  }

  console.log(`\nCompleted: ${created} created, ${skipped} skipped`)
}

seedAllSources()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })