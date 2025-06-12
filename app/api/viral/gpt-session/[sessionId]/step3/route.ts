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

    const currentResponse = session.response as Record<string, any> || {}
    const currentMetadata = session.metadata as Record<string, any> || {}

    if (!currentResponse.step2) {
      return NextResponse.json(
        { error: 'Step 2を先に完了してください' },
        { status: 400 }
      )
    }

    // Step 3: コンテンツコンセプト作成のプロンプト
    const prompt = buildStep3Prompt(currentMetadata.config, currentResponse.step2)

    console.log('Executing GPT Step 3 analysis...')
    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: currentMetadata.config.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${currentMetadata.config.expertise}の専門家で、バイラルコンテンツクリエイターです。
Step 2で特定した機会に対して、具体的なコンテンツコンセプトを作成してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // Step 3の結果を保存
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step3: response
        },
        tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 3,
          step3CompletedAt: new Date().toISOString()
        }
      }
    })

    // コンセプトを下書きとして保存
    const drafts = await Promise.all(
      response.concepts.map(async (concept: any, index: number) => {
        return await prisma.contentDraft.create({
          data: {
            analysisId: sessionId,
            conceptType: concept.type || 'general',
            category: concept.category || 'AI × 働き方',
            title: concept.title,
            content: concept.hook, // Step 3ではフックのみ
            explanation: concept.explanation || '',
            buzzFactors: concept.buzzFactors || [],
            targetAudience: concept.targetAudience || '',
            estimatedEngagement: concept.estimatedEngagement || {},
            hashtags: concept.hashtags || [],
            metadata: {
              conceptNumber: index + 1,
              platform: concept.platform,
              format: concept.format,
              angle: concept.angle,
              timing: concept.timing,
              visualDescription: concept.visualDescription,
              contentOutline: concept.contentOutline
            }
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      sessionId,
      step: 3,
      response: {
        concepts: response.concepts,
        summary: response.summary
      },
      draftsCreated: drafts.length,
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 4,
        url: `/api/viral/gpt-session/${sessionId}/step4`,
        description: '完全な投稿可能コンテンツ生成',
        message: response.nextStepMessage || 'バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトの完全な、すぐに投稿できるコンテンツが表示されます。'
      }
    })

  } catch (error) {
    console.error('GPT Step 3 error:', error)
    
    return NextResponse.json(
      { error: 'Step 3 コンセプト作成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildStep3Prompt(config: any, step2Data: any) {
  const topOpportunities = step2Data.topOpportunities.slice(0, 3)

  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

## Step 2の分析結果
${step2Data.summary}

選択された上位機会:
${topOpportunities.map((opp: any) => 
  `- ${opp.topic} (角度: ${opp.bestAngle})`
).join('\n')}

## タスク: Step 3 - コンテンツコンセプト作成

上位3つの機会それぞれに対して、以下のフレームワークに従ってコンテンツコンセプトを作成してください：

### コンテンツコンセプトフレームワーク
- プラットフォーム: [最適化されたプラットフォーム]
- 形式: [スレッド/ビデオ/投稿タイプ]
- フック: 「[注目を集める具体的なオープナー]」
- 角度: [独自の視点や見方]
- コンテンツ概要:
  - トレンドにつながるオープニングフック
  - [物語を構築する3～5つのキーポイント]
  - 予期せぬ洞察や啓示
  - エンゲージメントを促進するCTA
- タイミング: 最大の効果を得るには [X] 時間以内に投稿してください
- ビジュアル: [具体的な画像/動画の説明]
- ハッシュタグ: [プラットフォームに最適化されたタグ]

以下のJSON形式で回答してください：

**重要: すべての内容を日本語で記述してください。英語は使用しないでください。**

{
  "concepts": [
    {
      "conceptNumber": 1,
      "topic": "対象トピック",
      "platform": "${config.platform}",
      "format": "single/thread/video",
      "type": "controversy/empathy/humor/insight/news",
      "category": "AI依存/働き方改革/世代間ギャップ/未来予測",
      "title": "コンセプトタイトル",
      "hook": "注目を集める具体的なオープナー（20-30文字）",
      "angle": "独自の視点や見方",
      "contentOutline": {
        "openingHook": "トレンドにつながるオープニング",
        "keyPoints": [
          "キーポイント1",
          "キーポイント2",
          "キーポイント3"
        ],
        "unexpectedInsight": "予期せぬ洞察や啓示",
        "cta": "エンゲージメントを促進するCTA"
      },
      "timing": "X時間以内",
      "visualDescription": "具体的な画像/動画の説明",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
      "explanation": "なぜこのコンセプトがバズるのかの説明",
      "targetAudience": "ターゲット層の説明",
      "buzzFactors": ["バズ要因1", "要因2", "要因3"],
      "estimatedEngagement": {
        "likes": "1000-5000",
        "retweets": "200-1000",
        "replies": "50-200"
      }
    }
  ],
  "summary": "3つのコンセプトの要約",
  "nextStepMessage": "バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトの完全な、すぐに投稿できるコンテンツが表示されます。"
}
`
}