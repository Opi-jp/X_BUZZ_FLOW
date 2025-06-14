import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      minImportance = 0.7,
      maxTrends = 10,
      timeWindow = 48 // 時間単位
    } = body

    // Phase 1の結果を確認
    const dataCollectionResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/viral/analysis/phase1-data-collection`)
    const dataCollection = await dataCollectionResponse.json()

    if (!dataCollection.dataCollection.readyForAnalysis) {
      return NextResponse.json({
        error: 'データ収集が不十分です。Phase 1を完了してください。',
        dataQuality: dataCollection.dataCollection.dataQuality,
        suggestion: 'ニュースデータは十分ですが、バズ投稿収集を推奨します。ただし、ニュースのみでも分析可能です。'
      }, { status: 400 })
    }

    // 高重要度ニュースを取得
    const now = new Date()
    const timeLimit = new Date(now.getTime() - timeWindow * 60 * 60 * 1000)

    const [importantNews, buzzPosts, existingOpportunities] = await Promise.all([
      // 重要なニュース
      prisma.newsArticle.findMany({
        where: {
          createdAt: { gte: timeLimit },
          importance: { gte: minImportance },
          processed: true
        },
        include: {
          source: true,
          analysis: true
        },
        orderBy: { importance: 'desc' },
        take: 20
      }),

      // 高エンゲージメント投稿
      prisma.buzzPost.findMany({
        where: {
          collectedAt: { gte: new Date(now.getTime() - 6 * 60 * 60 * 1000) }, // 過去6時間
          likesCount: { gte: 1000 }
        },
        orderBy: { likesCount: 'desc' },
        take: 30
      }),

      // 既存の分析結果（重複回避）
      prisma.viralOpportunity.findMany({
        where: {
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        }
      })
    ])

    // ChatGPTによる詳細トレンド評価
    const prompt = buildPhase2Prompt({
      news: importantNews,
      buzzPosts,
      existingOpportunities
    })

    const startTime = Date.now()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは経験豊富なバイラルコンテンツ戦略家です。
          
データを多角的に分析し、バイラル可能性を正確に評価してください。

評価軸:
1. 論争レベル (0-1): 強い意見を生み出す度合い
2. 感情の強さ (0-1): 怒り、喜び、驚き、憤慨の強度
3. 共感性要因 (0-1): 多くの人に影響を与える度合い
4. 共有可能性 (0-1): 人々が広めたいと思う度合い
5. タイミング敏感性 (0-1): 関連性のウィンドウが狭い度合い

50代クリエイティブディレクターの視点で、AI×働き方のテーマに特化して分析してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // 分析ログを保存
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'chatgpt',
        phase: 'phase2_trend_evaluation',
        prompt,
        response,
        tokens: completion.usage?.total_tokens,
        duration,
        success: true
      }
    })

    // トレンド評価結果を処理・保存
    const trendEvaluations = await Promise.all(
      response.trends.slice(0, maxTrends).map(async (trend: any) => {
        const viralScore = calculateViralScore(trend.scores)
        
        return await prisma.viralOpportunity.create({
          data: {
            topic: trend.topic,
            platform: 'Twitter',
            viralScore,
            timeWindow: trend.timeWindow,
            angle: trend.angle,
            keywords: trend.keywords,
            sourceData: {
              relatedNews: trend.sourceData.relatedNews,
              relatedPosts: trend.sourceData.relatedPosts,
              scores: trend.scores,
              competitorAnalysis: trend.competitorAnalysis,
              engagementPrediction: trend.engagementPrediction
            },
            status: 'evaluated',
            analyzedAt: new Date()
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      phase: 2,
      analysis: {
        dataQuality: dataCollection.dataCollection.dataQuality,
        newsAnalyzed: importantNews.length,
        postsAnalyzed: buzzPosts.length,
        trendsIdentified: trendEvaluations.length,
        duration,
        tokens: completion.usage?.total_tokens
      },
      trends: trendEvaluations.map(trend => ({
        ...trend,
        sourceData: trend.sourceData as any
      })),
      summary: response.summary
    })

  } catch (error) {
    console.error('Phase 2 trend evaluation error:', error)
    
    await prisma.viralAnalysisLog.create({
      data: {
        model: 'chatgpt',
        phase: 'phase2_trend_evaluation',
        prompt: '',
        response: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })

    return NextResponse.json(
      { error: 'Phase 2 トレンド評価でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildPhase2Prompt(data: {
  news: any[]
  buzzPosts: any[]
  existingOpportunities: any[]
}) {
  return `
## Phase 2: トレンド評価分析

### 収集済みデータ

#### 重要ニュース (${data.news.length}件)
${data.news.map((news, i) => `
${i + 1}. 【${news.source?.name}】${news.title}
   要約: ${news.analysis?.japaneseSummary || news.summary}
   重要度: ${news.importance}
   カテゴリ: ${news.category}
   URL: ${news.url}
`).join('\n')}

#### 高エンゲージメント投稿 (${data.buzzPosts.length}件)
${data.buzzPosts.length > 0 ? 
  data.buzzPosts.slice(0, 15).map((post, i) => `
${i + 1}. @${post.authorUsername}
   "${post.content.substring(0, 120)}..."
   💖${post.likesCount} 🔄${post.retweetsCount} 💬${post.repliesCount}
   総エンゲージメント: ${post.likesCount + post.retweetsCount + post.repliesCount}
`).join('\n') : 
  '※ 現在バズ投稿データが不足しています。ニュース分析に加えて、あなたの知識で最近バズった類似投稿例も含めて分析してください。'
}

#### 既存分析済みトピック (重複回避用)
${data.existingOpportunities.map(opp => `• ${opp.topic}`).join('\n')}

### タスク
上記データから、バイラル可能性の高いトレンドを特定し、詳細に評価してください。

**重要指示**: バズ投稿データが不足している場合は、あなたの最新知識で以下も含めて分析してください：
- 最近のAI×働き方関連でバズった投稿例
- SNSで議論になりやすい論点
- 具体的な企業名・数値・事例（Klarna、IBM、ChatGPT障害等）
- 「即反応可能なバズ波」として浮上している社会動向

以下の形式でJSONレスポンスを返してください:

{
  "summary": "分析サマリー（全体的な傾向、注目すべきパターン）",
  "trends": [
    {
      "topic": "トレンドトピック名",
      "angle": "独自の切り口・視点",
      "timeWindow": "投稿推奨時間（時間単位）",
      "keywords": ["関連キーワード"],
      "scores": {
        "controversy": 0.0-1.0,
        "emotion": 0.0-1.0,
        "relatability": 0.0-1.0,
        "shareability": 0.0-1.0,
        "timing": 0.0-1.0
      },
      "sourceData": {
        "relatedNews": ["関連ニュースタイトル"],
        "relatedPosts": ["関連投稿の要約または推定例"],
        "buzzExamples": ["このトピックでバズりそうな投稿例"],
        "controversyPoints": ["議論になるポイント"],
        "concreteData": ["具体的な企業名・数値・事例"],
        "newsCount": 数値,
        "postsCount": 数値
      },
      "competitorAnalysis": "競合状況の分析",
      "engagementPrediction": {
        "likes": "予想いいね数レンジ",
        "retweets": "予想RT数レンジ",
        "replies": "予想リプ数レンジ"
      },
      "reasoning": "なぜバイラルポテンシャルが高いと判断したか"
    }
  ]
}

重要な評価観点:
- 既存トピックとの差別化
- 50代クリエイティブディレクターの視点（経験・洞察）
- AI×働き方テーマへの関連性
- タイミングの重要性（旬な話題か）
- 論争を呼ぶポテンシャル

注意: バズ投稿データが不足している場合は、ニュースの内容と過去のトレンドパターン、および最新のSNS動向を基に分析してください。
具体的な企業名・数値・事例を積極的に含め、「即反応可能なバズ波」を特定してください。
`
}

function calculateViralScore(scores: any): number {
  const weights = {
    controversy: 0.25,
    emotion: 0.20,
    relatability: 0.20,
    shareability: 0.25,
    timing: 0.10
  }

  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key] || 0) * weight
  }, 0)
}