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
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ3: バズるコンテンツのコンセプト作成

現在時刻: ${new Date().toLocaleString('ja-JP')}

### あなたの設定情報（フェーズ1-2から引き継ぎ）：
1. あなたの専門分野または業界: ${config.expertise}
2. 重点を置くプラットフォーム: ${config.platform}
3. コンテンツのスタイル: ${config.style}

### フェーズ2の分析結果
${step2Data.summary}

### 選択された上位機会（最もバズる可能性が高い3つ）
${topOpportunities.map((opp: any, idx: number) => {
  const articles = opp.sourceArticles || []
  return `
${idx + 1}. ${opp.topic}
   - バイラルスコア: ${opp.viralScore}
   - 最適な角度: ${opp.bestAngle}
   - ${config.expertise}ならではの独自性: ${opp.expertUniqueness || ''}
   - 推奨タイミング: ${opp.timeWindow}
   - 参照記事:
${articles.map((article: any) => `     • ${article.title} (${article.url || 'URLなし'})`).join('\n')}
`
}).join('\n')}

具体的で実行可能なコンテンツコンセプトを「${config.expertise}」の専門家として作成します。

### コンテンツコンセプトフレームワーク
それぞれの機会について、以下を開発します：

- プラットフォーム: ${config.platform}に最適化
- 形式: ${config.platform}に適した形式（スレッド/単発/ビデオなど）
- フック: 「${config.expertise}の視点から注目を集める具体的なオープナー」
- 角度: ${config.expertise}ならではの独自の視点
- コンテンツ概要:
  - トレンドと${config.expertise}をつなぐオープニングフック
  - ${config.expertise}の専門知識を活かした3-5つのキーポイント
  - ${config.expertise}だからこそ語れる予期せぬ洞察
  - ${config.style}に合ったエンゲージメントCTA
- タイミング: 最大の効果を得るための投稿時間
- ビジュアル: ${config.platform}に適した具体的な画像/動画の説明
- ハッシュタグ: ${config.platform}と${config.expertise}に最適化されたタグ

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
      "hook": "${config.expertise}の視点から注目を集める具体的なオープナー（20-30文字）",
      "angle": "${config.expertise}ならではの独自の視点",
      "contentOutline": {
        "openingHook": "トレンドと${config.expertise}をつなぐオープニング",
        "keyPoints": [
          "${config.expertise}の専門知識を活かしたポイント1",
          "${config.expertise}の専門知識を活かしたポイント2",
          "${config.expertise}の専門知識を活かしたポイント3"
        ],
        "unexpectedInsight": "${config.expertise}だからこそ語れる予期せぬ洞察",
        "cta": "${config.style}に合ったエンゲージメントCTA"
      },
      "timing": "X時間以内",
      "visualDescription": "${config.platform}に適した画像/動画の説明",
      "hashtags": ["${config.expertise}関連タグ1", "トレンドタグ2"],
      "explanation": "${config.expertise}の専門家として、なぜこのコンセプトがバズるのかの説明",
      "targetAudience": "${config.expertise}に興味があるターゲット層の説明",
      "buzzFactors": ["${config.expertise}ならではのバズ要因1", "要因2", "要因3"],
      "estimatedEngagement": {
        "likes": "1000-5000",
        "retweets": "200-1000",
        "replies": "50-200"
      },
      "sourceArticles": [
        {
          "title": "参照した記事タイトル",
          "url": "記事URL",
          "usage": "この記事をどう活用するか（引用、参考、データ引用など）"
        }
      ]
    }
  ],
  "summary": "3つのコンセプトの要約",
  "nextStepMessage": "バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトの完全な、すぐに投稿できるコンテンツが表示されます。"
}
`
}