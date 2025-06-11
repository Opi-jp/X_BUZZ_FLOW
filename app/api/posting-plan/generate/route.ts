import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 1日の投稿計画を自動生成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      targetCount = 15, // 1日の目標投稿数
      date = new Date().toISOString().split('T')[0] // 計画日
    } = body
    
    // 1. 最新のPerplexityレポートを取得
    const perplexityReport = await prisma.perplexityReport.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
    
    // 2. 重要ニュースを取得
    const newsArticles = await prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        importance: { gte: 0.7 }
      },
      orderBy: { importance: 'desc' },
      take: 10
    })
    
    // 3. 高エンゲージメントのバズ投稿を取得
    const buzzPosts = await prisma.buzzPost.findMany({
      where: {
        collectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        likesCount: { gte: 1000 }
      },
      orderBy: { likesCount: 'desc' },
      take: 20
    })
    
    // 4. 投稿計画を生成
    const postingPlan = await generateDailyPlan({
      targetCount,
      date,
      perplexityInsights: perplexityReport,
      newsArticles,
      buzzPosts
    })
    
    // 5. 計画をデータベースに保存（新しいテーブルが必要な場合）
    // TODO: PostingPlanテーブルを作成して保存
    
    return NextResponse.json({
      success: true,
      date,
      totalPosts: postingPlan.length,
      plan: postingPlan,
      breakdown: {
        quoteRT: postingPlan.filter(p => p.type === 'quote_rt').length,
        commentRT: postingPlan.filter(p => p.type === 'comment_rt').length,
        original: postingPlan.filter(p => p.type === 'original').length,
        newsThread: postingPlan.filter(p => p.type === 'news_thread').length
      }
    })
    
  } catch (error) {
    console.error('Posting plan generation error:', error)
    return NextResponse.json(
      { error: '投稿計画の生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 投稿計画生成ロジック
async function generateDailyPlan(params: {
  targetCount: number
  date: string
  perplexityInsights: any
  newsArticles: any[]
  buzzPosts: any[]
}): Promise<PostPlan[]> {
  const { targetCount, perplexityInsights, newsArticles, buzzPosts } = params
  const plan: PostPlan[] = []
  
  // 投稿タイプの配分（プロジェクトオーナーの戦略に基づく）
  const distribution = {
    quote_rt: Math.floor(targetCount * 0.4), // 40% - エンゲージメント獲得
    comment_rt: Math.floor(targetCount * 0.2), // 20% - 深い洞察
    original: Math.floor(targetCount * 0.25), // 25% - 独自視点
    news_thread: Math.floor(targetCount * 0.15) // 15% - 情報発信
  }
  
  // 時間帯の最適化（日本時間）
  const optimalTimes = {
    morning: ['07:00', '07:30', '08:00', '08:30', '09:00'], // 通勤時間
    lunch: ['12:00', '12:30', '13:00'], // ランチタイム
    evening: ['18:00', '18:30', '19:00', '19:30'], // 帰宅時間
    night: ['21:00', '21:30', '22:00', '22:30', '23:00'] // ゴールデンタイム
  }
  
  // 1. 引用RT（高エンゲージメント狙い）
  const highEngagementPosts = buzzPosts
    .filter(p => p.authorFollowers > 50000 && p.likesCount > 5000)
    .slice(0, distribution.quote_rt)
  
  highEngagementPosts.forEach((post, index) => {
    plan.push({
      type: 'quote_rt',
      scheduledTime: getScheduledTime(optimalTimes.morning[index] || optimalTimes.evening[index % 4]),
      targetPost: {
        id: post.id,
        url: post.url,
        author: post.authorUsername,
        content: post.content
      },
      suggestedContent: generateQuoteRTContent(post, perplexityInsights),
      reasoning: '高エンゲージメント投稿への価値追加',
      priority: 'high',
      expectedEngagement: estimateEngagement('quote_rt', post)
    })
  })
  
  // 2. コメント付き引用RT（議論喚起）
  const discussionPosts = buzzPosts
    .filter(p => p.content.includes('?') || p.content.includes('どう思う'))
    .slice(0, distribution.comment_rt)
  
  discussionPosts.forEach((post, index) => {
    plan.push({
      type: 'comment_rt',
      scheduledTime: getScheduledTime(optimalTimes.lunch[index % 3]),
      targetPost: {
        id: post.id,
        url: post.url,
        author: post.authorUsername,
        content: post.content
      },
      suggestedContent: generateCommentRTContent(post, perplexityInsights),
      reasoning: '議論への独自視点追加',
      priority: 'medium',
      expectedEngagement: estimateEngagement('comment_rt', post)
    })
  })
  
  // 3. 独自投稿（ブランド構築）
  const originalTopics = perplexityInsights?.personalAngles || []
  const originalCount = Math.min(distribution.original, originalTopics.length + 3)
  
  for (let i = 0; i < originalCount; i++) {
    const timeSlot = i < 2 ? optimalTimes.night[i] : optimalTimes.evening[i % 4]
    const topic = originalTopics[i] || generateOriginalTopic(perplexityInsights, i)
    
    plan.push({
      type: 'original',
      scheduledTime: getScheduledTime(timeSlot),
      theme: topic.type || 'insight',
      suggestedContent: topic.postTemplate || generateOriginalContent(topic, i),
      reasoning: topic.angle || '独自視点の確立',
      priority: i === 0 ? 'high' : 'medium',
      expectedEngagement: estimateEngagement('original')
    })
  }
  
  // 4. ニューススレッド（情報発信者として）
  const topNews = newsArticles.slice(0, distribution.news_thread)
  
  topNews.forEach((news, index) => {
    plan.push({
      type: 'news_thread',
      scheduledTime: getScheduledTime(optimalTimes.morning[index + 2] || optimalTimes.lunch[0]),
      newsArticle: {
        id: news.id,
        title: news.title,
        summary: news.summary,
        url: news.url
      },
      suggestedContent: generateNewsThreadContent(news),
      reasoning: '最新情報の独自解釈',
      priority: news.importance > 0.9 ? 'high' : 'medium',
      expectedEngagement: estimateEngagement('news_thread')
    })
  })
  
  // 時間順にソート
  return plan.sort((a, b) => 
    new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  )
}

// 各種コンテンツ生成関数
function generateQuoteRTContent(post: any, insights: any): string {
  const templates = [
    `これは面白い視点。23年の映像制作経験から言うと、`,
    `${post.authorUsername}さんの指摘は的確。さらに付け加えるなら、`,
    `まさにこれ。1990年代のCG革命時も同じことが起きた。`,
    `50代の視点から見ると、この現象は`,
    `逆説的だが、効率化の先にあるのは`
  ]
  
  return templates[Math.floor(Math.random() * templates.length)]
}

function generateCommentRTContent(post: any, insights: any): string {
  return `興味深い問いかけ。\n\n私の経験では、${insights?.trends?.[0] || 'AI活用'}において重要なのは、効率化ではなく「創造性の拡張」。\n\nあえて非効率を選ぶことで見えてくる景色もある。みなさんはどう思いますか？`
}

function generateOriginalContent(topic: any, index: number): string {
  const templates = [
    `AIツールで1時間かかっていた作業が5分に。でも、その浮いた55分で何をするかが本当の勝負。\n\n効率化の先にあるのは、より深い創造への没入。`,
    `23年前「CGが仕事を奪う」と言われた。\n今「AIが仕事を奪う」と言われている。\n\n歴史は繰り返すが、適応した者だけが新しい景色を見られる。`,
    `50代でAI活用を始めて分かったこと。\n\n若者の「速さ」には勝てない。\nでも「深さ」なら負けない。\n\n経験×AIは最強の組み合わせ。`
  ]
  
  return templates[index % templates.length]
}

function generateNewsThreadContent(news: any): string {
  return `【${news.title}】\n\n要点：\n${news.summary}\n\n50代クリエイターの視点：\nこの動きは、単なる技術進化ではなく、働き方の根本的な変革を示唆している。\n\n詳しくはスレッドで解説👇`
}

function generateOriginalTopic(insights: any, index: number): any {
  const topics = [
    {
      type: 'paradox',
      angle: '効率化への逆張り',
      postTemplate: 'AIで効率化が進むほど、「無駄」の価値が高まる。'
    },
    {
      type: 'experience',
      angle: '経験者の優位性',
      postTemplate: '23年の経験が教えてくれたこと：技術は変わっても、人間の本質は変わらない。'
    },
    {
      type: 'prediction',
      angle: '未来予測',
      postTemplate: '2025年末には、AIを使えない人より「AIに頼りすぎる人」の方が問題になる。'
    }
  ]
  
  return topics[index % topics.length]
}

function getScheduledTime(time: string): string {
  const today = new Date()
  const [hours, minutes] = time.split(':').map(Number)
  today.setHours(hours, minutes, 0, 0)
  return today.toISOString()
}

function estimateEngagement(type: string, post?: any): number {
  const baseRates: { [key: string]: number } = {
    quote_rt: 0.03,
    comment_rt: 0.025,
    original: 0.02,
    news_thread: 0.015
  }
  
  let rate = baseRates[type] || 0.02
  
  // 参照投稿の影響
  if (post) {
    if (post.likesCount > 10000) rate *= 1.5
    if (post.authorFollowers > 100000) rate *= 1.3
  }
  
  return rate
}

// 投稿計画の型定義
interface PostPlan {
  type: 'quote_rt' | 'comment_rt' | 'original' | 'news_thread'
  scheduledTime: string
  targetPost?: {
    id: string
    url: string
    author: string
    content: string
  }
  newsArticle?: {
    id: string
    title: string
    summary: string
    url: string
  }
  theme?: string
  suggestedContent: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  expectedEngagement: number
}