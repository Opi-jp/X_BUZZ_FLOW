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
    const { articles } = await request.json()
    
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json(
        { error: '分析する記事が必要です' },
        { status: 400 }
      )
    }
    
    // セッション情報を取得
    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId }
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    const config = (session.metadata as any)?.config || {}
    
    console.log(`Step 1-B: Analyzing ${articles.length} articles...`)
    const startTime = Date.now()

    // Chat Completions APIで詳細分析（max_tokens設定可能）
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。
          
専門分野: ${config?.expertise || 'AI × 働き方'}
プラットフォーム: ${config?.platform || 'Twitter'}
スタイル: ${config?.style || '洞察的'}`
        },
        {
          role: 'user',
          content: buildAnalysisPrompt(config, articles)
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,  // 十分な長さを確保
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const analysisResult = JSON.parse(completion.choices[0].message.content || '{}')
    
    console.log('Analysis completed - opportunities:', analysisResult.opportunityCount)

    // Step 1の結果を保存
    const currentResponse = session.response as Record<string, any> || {}
    const currentMetadata = session.metadata as Record<string, any> || {}
    
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step1: analysisResult
        },
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          usedTwoStepApproach: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 1,
      response: analysisResult,
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: analysisResult.nextStepMessage
      }
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: '分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildAnalysisPrompt(config: any, articles: any[]) {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  
  return `
## フェーズ1: 収集した記事の詳細分析

現在時刻: ${today.toLocaleString('ja-JP')}
今日の日付: ${formattedDate}

以下の${articles.length}件の記事を「${config?.expertise || 'AI × 働き方'}」の専門家として分析し、48時間以内にバズるチャンスを特定してください。

収集した記事：
${articles.map((article, i) => `
${i + 1}. ${article.title}
   URL: ${article.url}
   日付: ${article.publishDate}
   ソース: ${article.source}
   カテゴリ: ${article.category}
`).join('')}

これらの記事を分析し、以下のJSON形式で詳細な分析結果を提供してください：

{
  "articleAnalysis": [
    {
      "title": "記事タイトル",
      "source": "メディア名",
      "url": "URL",
      "publishDate": "日付",
      "category": "カテゴリ",
      "importance": 0.0-1.0,
      "summary": "この記事の内容を100文字程度で要約",
      "keyPoints": [
        "重要ポイント1",
        "重要ポイント2",
        "重要ポイント3"
      ],
      "expertPerspective": "${config?.expertise || 'AI × 働き方'}の専門家としての独自の解釈や関連付け",
      "viralPotential": "${config?.expertise || 'AI × 働き方'}の視点から見たバズる可能性とその理由"
    }
  ],
  "currentEvents": {
    "latestNews": [{"title": "...", "impact": 0.0-1.0, "category": "..."}],
    "celebrityEvents": [],
    "politicalDevelopments": [],
    "techAnnouncements": [],
    "businessNews": [],
    "culturalMoments": [],
    "sportsEvents": [],
    "internetDrama": []
  },
  "socialListening": {
    "twitter": {"trends": [], "velocity": 0.0-1.0},
    "tiktok": {"sounds": [], "challenges": []},
    "reddit": {"hotPosts": [], "sentiment": "..."},
    "googleTrends": {"risingQueries": []},
    "youtube": {"trendingTopics": []},
    "newsComments": {"sentiment": "...", "volume": 0.0-1.0},
    "socialEngagement": {"patterns": []}
  },
  "viralPatterns": {
    "topOpportunities": [
      {
        "topic": "具体的なトピック名",
        "expertAngle": "${config?.expertise || 'AI × 働き方'}の視点からの独自アングル",
        "scores": {
          "controversy": 0.0-1.0,
          "emotion": 0.0-1.0,
          "relatability": 0.0-1.0,
          "shareability": 0.0-1.0,
          "timing": 0.0-1.0,
          "platformFit": 0.0-1.0
        },
        "overallScore": 0.0-1.0,
        "reasoning": "なぜこれがバズるのかの説明"
      }
    ]
  },
  "opportunityCount": 5,
  "summary": "全体的な分析サマリー（200文字程度）",
  "keyPoints": [
    "${config?.expertise || 'AI × 働き方'}の視点から見た重要ポイント1",
    "重要ポイント2",
    "重要ポイント3",
    "重要ポイント4",
    "重要ポイント5"
  ],
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内に[X]件のバズるチャンスが出現すると特定しました。"
}`
}