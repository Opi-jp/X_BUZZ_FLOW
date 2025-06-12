import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  console.log('Viral analyze-trends API called')
  
  // 環境変数チェック
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set')
    return NextResponse.json(
      { error: 'OpenAI APIキーが設定されていません' },
      { status: 500 }
    )
  }
  
  try {
    const body = await request.json()
    const {
      expertise = 'AI × 働き方、25年のクリエイティブ経験',
      platform = 'Twitter',
      style = '解説 × エンタメ',
      forceRefresh = false // キャッシュを無視して新規分析
    } = body

    // 1時間以内の分析結果があればそれを返す（キャッシュ）
    if (!forceRefresh) {
      const recentAnalysis = await prisma.viralOpportunity.findMany({
        where: {
          platform,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
        },
        orderBy: { viralScore: 'desc' },
        take: 5
      })

      if (recentAnalysis.length >= 3) {
        return NextResponse.json({
          success: true,
          fromCache: true,
          opportunities: recentAnalysis
        })
      }
    }

    // 最新データを収集
    const [newsData, buzzPosts] = await Promise.all([
      getLatestNews(),
      getLatestBuzzPosts()
    ])

    // ChatGPTプロンプト構築
    const prompt = buildAnalysisPrompt({
      expertise,
      platform,
      style,
      newsData,
      buzzPosts
    })

    // ChatGPT API呼び出し
    const startTime = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // 分析ログを保存
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'chatgpt',
        phase: 'trend_analysis',
        prompt,
        response,
        tokens: completion.usage?.total_tokens,
        duration,
        success: true
      }
    })

    // バイラル機会をDBに保存
    const opportunities = await Promise.all(
      response.opportunities.map(async (opp: any) => {
        return await prisma.viralOpportunity.create({
          data: {
            topic: opp.topic,
            platform,
            viralScore: opp.viralScore,
            timeWindow: opp.timeWindow,
            angle: opp.angle,
            keywords: opp.keywords || [],
            sourceData: opp.sourceData || {},
            status: 'identified',
            analyzedAt: new Date()
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      fromCache: false,
      opportunities,
      analysis: {
        duration,
        tokens: completion.usage?.total_tokens
      }
    })

  } catch (error) {
    console.error('Viral trend analysis error:', error)
    
    // エラーログを保存
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'chatgpt',
        phase: 'trend_analysis',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'トレンド分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 最新ニュースを取得
async function getLatestNews() {
  const news = await prisma.newsArticle.findMany({
    where: {
      publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      processed: true,
      importance: { gte: 0.7 }
    },
    orderBy: { importance: 'desc' },
    take: 10,
    include: { analysis: true }
  })

  return news.map(article => ({
    title: article.title,
    summary: article.analysis?.japaneseSummary || article.summary,
    importance: article.importance,
    category: article.category,
    url: article.url
  }))
}

// 最新のバズ投稿を取得
async function getLatestBuzzPosts() {
  const posts = await prisma.buzzPost.findMany({
    where: {
      postedAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      likesCount: { gte: 1000 }
    },
    orderBy: { likesCount: 'desc' },
    take: 20
  })

  return posts.map(post => ({
    content: post.content,
    author: post.authorUsername,
    likes: post.likesCount,
    retweets: post.retweetsCount,
    engagement: post.likesCount + post.retweetsCount + post.repliesCount
  }))
}

// 分析プロンプトを構築
function buildAnalysisPrompt(data: {
  expertise: string
  platform: string
  style: string
  newsData: any[]
  buzzPosts: any[]
}) {
  return `
専門分野: ${data.expertise}
プラットフォーム: ${data.platform}
コンテンツスタイル: ${data.style}

## 現在のデータ

### 最新ニュース（重要度順）
${data.newsData.map((news, i) => 
  `${i + 1}. ${news.title}\n   要約: ${news.summary}\n   重要度: ${news.importance}`
).join('\n\n')}

### バズっている投稿（エンゲージメント順）
${data.buzzPosts.slice(0, 10).map((post, i) => 
  `${i + 1}. @${post.author}\n   "${post.content.substring(0, 100)}..."\n   いいね: ${post.likes}, RT: ${post.retweets}`
).join('\n\n')}

## タスク
上記のデータを分析し、今後48時間以内にバズる可能性の高いトピックを3-5個特定してください。

以下の形式でJSONで回答してください：
{
  "opportunities": [
    {
      "topic": "トピック名",
      "viralScore": 0.0-1.0の数値,
      "timeWindow": 投稿すべき時間（時間単位）,
      "angle": "独自の切り口",
      "keywords": ["関連", "キーワード"],
      "sourceData": {
        "relatedNews": ["関連ニュースのタイトル"],
        "relatedPosts": ["関連投稿の要約"]
      },
      "reasoning": "なぜバズると考えるか"
    }
  ]
}

特に以下の観点で分析してください：
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
`
}