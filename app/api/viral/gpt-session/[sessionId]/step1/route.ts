import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params

    // セッション情報を取得
    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      )
    }

    const config = session.metadata as any

    // 最新ニュースデータを取得
    const newsData = await getLatestNewsData()

    // Step 1: データ収集・初期分析のプロンプト
    const prompt = buildStep1Prompt(config.config, newsData)

    console.log('Executing GPT Step 1 analysis...')
    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${config.config.expertise}の専門家で、SNSトレンドアナリストです。
現在の出来事を包括的に分析し、バイラルコンテンツの機会を特定してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // Step 1の結果を保存
    const currentResponse = session.response as Record<string, any> || {}
    const currentMetadata = session.metadata as Record<string, any> || {}
    
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step1: response
        },
        tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 1,
      response: {
        articleAnalysis: response.articleAnalysis || [],
        currentEvents: response.currentEvents,
        socialListening: response.socialListening,
        viralPatterns: response.viralPatterns,
        opportunityCount: response.opportunityCount,
        summary: response.summary,
        keyPoints: response.keyPoints || []
      },
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: response.nextStepMessage || `トレンド分析に基づき、今後48時間以内に${response.opportunityCount}件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。`
      }
    })

  } catch (error) {
    console.error('GPT Step 1 error:', error)
    
    return NextResponse.json(
      { error: 'Step 1 分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

async function getLatestNewsData() {
  const news = await prisma.newsArticle.findMany({
    where: {
      publishedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      processed: true
    },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    include: { 
      source: true,
      analysis: true 
    }
  })

  return news.map(article => ({
    title: article.title,
    summary: article.analysis?.japaneseSummary || article.summary,
    source: article.source.name,
    category: article.category,
    importance: article.importance,
    url: article.url,
    publishedAt: article.publishedAt
  }))
}

function buildStep1Prompt(config: any, newsData: any[]) {
  const newsSection = newsData.map((news, i) => 
    `${i + 1}. 【${news.source}】${news.title}
    カテゴリ: ${news.category} | 重要度: ${news.importance}`
  ).join('\n')

  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

## 最新ニュースデータ（${newsData.length}件）
${newsSection}

## タスク: Step 1 - データ収集・初期分析

以下の観点で包括的な分析を行ってください：

### 1. 現在の出来事の分析
以下の8カテゴリで現在起きている重要な出来事を分析：
- 最新ニュースと最新ニュース
- 有名人の事件と世間の反応
- 政治的展開が議論を巻き起こす
- テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

### 2. ソーシャルリスニング研究
以下のプラットフォームでの動向を分析（実際のデータがない場合は推測）：
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

### 3. ウイルスパターン認識
各トピックを以下の6軸で評価（0-1のスコア）：
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォームの調整（プラットフォーム文化に適合）

以下のJSON形式で回答してください。
**重要: すべての内容を日本語で記述してください。英語は使用しないでください。**

{
  "articleAnalysis": [
    {
      "title": "記事タイトル",
      "source": "ソース名",
      "category": "カテゴリ",
      "importance": 0.0-1.0,
      "summary": "この記事の要約（100文字程度）",
      "keyPoints": [
        "重要ポイント1",
        "重要ポイント2",
        "重要ポイント3"
      ],
      "viralPotential": "なぜこの記事がバズる可能性があるか"
    }
  ],
  "currentEvents": {
    "latestNews": [{"title": "...", "impact": 0.0-1.0, "category": "..."}],
    "celebrityEvents": [...],
    "politicalDevelopments": [...],
    "techAnnouncements": [...],
    "businessNews": [...],
    "culturalMoments": [...],
    "sportsEvents": [...],
    "internetDrama": [...]
  },
  "socialListening": {
    "twitter": {"trends": [...], "velocity": 0.0-1.0},
    "tiktok": {"sounds": [...], "challenges": [...]},
    "reddit": {"hotPosts": [...], "sentiment": "..."},
    "googleTrends": {"risingQueries": [...]},
    "youtube": {"trendingTopics": [...]},
    "newsComments": {"sentiment": "...", "volume": 0.0-1.0},
    "socialEngagement": {"patterns": [...]}
  },
  "viralPatterns": {
    "topOpportunities": [
      {
        "topic": "具体的なトピック名（日本語）",
        "scores": {
          "controversy": 0.0-1.0,
          "emotion": 0.0-1.0,
          "relatability": 0.0-1.0,
          "shareability": 0.0-1.0,
          "timing": 0.0-1.0,
          "platformFit": 0.0-1.0
        },
        "overallScore": 0.0-1.0
      }
      // 最低5件、最大10件のバズる機会を特定してください
    ]
  },
  "opportunityCount": 数値,
  "summary": "全体的な分析サマリー（200文字程度）",
  "keyPoints": [
    "重要なポイント1",
    "重要なポイント2",
    "重要なポイント3",
    "重要なポイント4",
    "重要なポイント5"
  ],
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内に[X]件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。"
}
`
}