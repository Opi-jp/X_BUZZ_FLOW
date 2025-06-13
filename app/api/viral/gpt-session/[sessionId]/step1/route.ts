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

    // Step 1: データ収集・初期分析のプロンプト
    const prompt = buildStep1PromptDirect(config.config)

    console.log('Executing GPT Step 1 analysis...')
    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: config.config.model || 'gpt-4-turbo-preview',
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
    const rawResponse = completion.choices[0].message.content || '{}'
    console.log('GPT Step 1 raw response length:', rawResponse.length)
    
    let response
    try {
      response = JSON.parse(rawResponse)
      console.log('Parsed response - articleAnalysis count:', response.articleAnalysis?.length || 0)
    } catch (parseError) {
      console.error('Failed to parse GPT response:', parseError)
      console.error('Raw response:', rawResponse.substring(0, 500))
      throw new Error('GPT応答の解析に失敗しました')
    }

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

function buildStep1PromptDirect(config: any) {
  return `
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ1: トレンド情報の収集

ユーザー設定：
- 発信したい分野: ${config?.expertise || 'AI × 働き方'}
- プラットフォーム: ${config?.platform || 'Twitter'}
- コンテンツのスタイル: ${config?.style || '解説'}

現在の出来事を分析して、あなたのコンテンツがバズるチャンスを特定します。

現在の出来事の分析
- 最新ニュースと最新ニュース
- 有名人の事件と世間の反応
- 政治的展開が議論を巻き起こす
- テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

ソーシャルリスニング研究
以下のプラットフォームでの動向を分析（実際のデータがない場合は推測）：
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

ウイルスパターン認識
ウイルス感染の可能性があるトピックを特定する:
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォームの調整（プラットフォーム文化に適合）

上記のすべての分野から幅広くトレンドを収集し、${config?.expertise || 'あなたの発信分野'}に関連するもので、
${config?.platform || 'あなたのプラットフォーム'}でバズる可能性があるトピックを特定してください。

現在の調査結果: 「トレンド分析に基づき、今後 48 時間以内に [X] 件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。」

以下のJSON形式で回答してください。

{
  "articleAnalysis": [
    {
      "title": "実際にありそうな具体的な記事タイトル",
      "source": "TechCrunch/The Verge/日経新聞/Bloomberg等の実際のメディア名",
      "category": "AI/ビジネス/規制/研究/製品発表等",
      "importance": 0.0-1.0,
      "summary": "この記事の内容を100文字程度で要約",
      "keyPoints": [
        "重要ポイント1（具体的に）",
        "重要ポイント2（具体的に）",
        "重要ポイント3（具体的に）"
      ],
      "viralPotential": "なぜこの記事がバズる可能性があるか（具体的な理由）"
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