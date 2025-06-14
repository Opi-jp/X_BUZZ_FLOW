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
      analysisType = 'comprehensive', // comprehensive, trends, concepts
      saveAsDraft = true
    } = body

    // Step 1: 最新ニュースデータを取得
    const newsData = await getLatestNewsData()

    // Step 2: GPTで包括的分析を実行
    const analysisPrompt = buildComprehensivePrompt(newsData, analysisType)
    
    console.log('Executing GPT analysis...')
    const startTime = Date.now()
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、AI×働き方分野の専門家で、SNSトレンドアナリストです。
          
50代クリエイティブディレクターの視点から分析を行い、以下を提供してください：
1. 詳細なトレンド分析と解説
2. 各トレンドに対する複数のコンセプト
3. 具体的な投稿案
4. バズる理由の解説`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // Step 3: 分析結果をDBに保存
    const savedAnalysis = await prisma.gptAnalysis.create({
      data: {
        analysisType,
        prompt: analysisPrompt,
        response,
        tokens: completion.usage?.total_tokens,
        duration,
        metadata: {
          newsCount: newsData.length,
          timestamp: new Date().toISOString(),
          model: 'gpt-4-turbo-preview'
        }
      }
    })

    // Step 4: 各コンセプトを下書きとして保存
    if (saveAsDraft && response.concepts) {
      const drafts = await Promise.all(
        response.concepts.map(async (concept: any) => {
          return await prisma.contentDraft.create({
            data: {
              analysisId: savedAnalysis.id,
              conceptType: concept.type || 'general',
              category: concept.category,
              title: concept.title,
              content: concept.content,
              explanation: concept.explanation,
              buzzFactors: concept.buzzFactors,
              targetAudience: concept.targetAudience,
              estimatedEngagement: concept.estimatedEngagement,
              hashtags: concept.hashtags || [],
              status: 'draft',
              metadata: {
                trend: concept.trend,
                angle: concept.angle,
                emotionalTone: concept.emotionalTone,
                postTiming: concept.postTiming
              }
            }
          })
        })
      )
    }

    return NextResponse.json({
      success: true,
      analysis: {
        id: savedAnalysis.id,
        type: analysisType,
        overview: response.overview,
        trends: response.trends,
        concepts: response.concepts,
        recommendations: response.recommendations,
        duration,
        tokens: completion.usage?.total_tokens
      },
      draftsCreated: response.concepts?.length || 0,
      nextSteps: {
        reviewUrl: `/viral/review/${savedAnalysis.id}`,
        conceptsUrl: `/viral/concepts?analysisId=${savedAnalysis.id}`
      }
    })

  } catch (error) {
    console.error('GPT analysis error:', error)
    
    return NextResponse.json(
      { error: 'GPT分析でエラーが発生しました' },
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
    take: 30,
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

function buildComprehensivePrompt(newsData: any[], analysisType: string) {
  const newsSection = newsData.map((news, i) => 
    `${i + 1}. 【${news.source}】${news.title}
    要約: ${news.summary}
    カテゴリ: ${news.category} | 重要度: ${news.importance}`
  ).join('\n\n')

  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
分析タイプ: ${analysisType}

## 最新AIニュース（${newsData.length}件）
${newsSection}

## タスク

上記のニュースデータを基に、以下の包括的な分析を行ってください：

1. **トレンド分析**
   - 即反応可能な「バズ波」の特定
   - 具体的な企業名・数値・事例を含める
   - ChatGPT障害、リストラ懸念、AI疲れなど最新の議論を考慮

2. **各トレンドに対する複数コンセプト生成**
   - トレンドごとに3-5個のコンセプトを生成
   - それぞれ異なる角度・感情・ターゲット層

3. **詳細な解説**
   - なぜバズるのかの論理的説明
   - 予想される反応とエンゲージメント

以下のJSON形式で回答してください：

{
  "overview": {
    "summary": "全体的な分析サマリー",
    "keyInsights": ["重要な洞察1", "洞察2", "洞察3"],
    "immediateOpportunities": ["即座に活用できる機会"]
  },
  "trends": [
    {
      "id": "trend_1",
      "title": "トレンドタイトル",
      "description": "詳細な説明",
      "viralScore": 0.0-1.0,
      "timeWindow": "XX時間以内",
      "keyData": {
        "companies": ["関連企業"],
        "numbers": ["具体的数値"],
        "events": ["関連イベント"]
      }
    }
  ],
  "concepts": [
    {
      "trend": "trend_1",
      "type": "controversy|empathy|humor|insight|news",
      "category": "AI依存|働き方改革|世代間ギャップ|未来予測",
      "title": "コンセプトタイトル",
      "content": "140文字以内の投稿文案",
      "explanation": "なぜこれがバズるのかの詳細説明",
      "angle": "独自の切り口",
      "emotionalTone": "挑発的|共感的|皮肉|建設的",
      "targetAudience": "ターゲット層の説明",
      "buzzFactors": ["バズ要因1", "要因2", "要因3"],
      "estimatedEngagement": {
        "likes": "1000-5000",
        "retweets": "200-1000",
        "replies": "50-200"
      },
      "hashtags": ["ハッシュタグ1", "タグ2"],
      "postTiming": "morning|lunch|evening|night"
    }
  ],
  "recommendations": {
    "immediate": ["すぐに実行すべきアクション"],
    "shortTerm": ["1-3日以内のアクション"],
    "monitoring": ["継続的に監視すべき要素"]
  }
}

重要：
- 50代クリエイティブディレクターの視点を維持
- 具体性と即効性を重視
- 各コンセプトは異なる感情・角度でアプローチ
- 実際の企業名や数値を積極的に使用
`
}