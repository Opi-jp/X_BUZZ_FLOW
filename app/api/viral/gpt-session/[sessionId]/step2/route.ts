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

    if (!currentResponse.step1) {
      return NextResponse.json(
        { error: 'Step 1を先に完了してください' },
        { status: 400 }
      )
    }

    // Step 2: トレンド評価・角度分析のプロンプト
    const prompt = buildStep2Prompt(currentMetadata.config, currentResponse.step1)

    console.log('Executing GPT Step 2 analysis...')
    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: currentMetadata.config.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${currentMetadata.config.expertise}の専門家で、バイラルコンテンツ戦略家です。
Step 1で特定したトレンドを詳細に評価し、最適なコンテンツアングルを特定してください。`
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

    // Step 2の結果を保存
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step2: response
        },
        tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 2,
          step2CompletedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 2,
      response: {
        viralVelocity: response.viralVelocity,
        contentAngles: response.contentAngles,
        topOpportunities: response.topOpportunities,
        summary: response.summary
      },
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 3,
        url: `/api/viral/gpt-session/${sessionId}/step3`,
        description: 'コンテンツコンセプト作成',
        message: response.nextStepMessage || '特定の角度から、最もバズる可能性の高い機会をご紹介します。コンテンツのコンセプトについては、「続行」と入力してください。'
      }
    })

  } catch (error) {
    console.error('GPT Step 2 error:', error)
    
    return NextResponse.json(
      { error: 'Step 2 分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildStep2Prompt(config: any, step1Data: any) {
  const topOpportunities = step1Data.viralPatterns.topOpportunities
    .sort((a: any, b: any) => b.overallScore - a.overallScore)
    .slice(0, 5)

  // 重要度の高い記事を取得
  const topArticles = (step1Data.articleAnalysis || [])
    .sort((a: any, b: any) => b.importance - a.importance)
    .slice(0, 5)

  return `
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ2: バズる機会評価

現在時刻: ${new Date().toLocaleString('ja-JP')}

### あなたの設定情報（フェーズ1から引き継ぎ）：
1. あなたの専門分野または業界: ${config.expertise}
2. 重点を置くプラットフォーム: ${config.platform}
3. コンテンツのスタイル: ${config.style}

### フェーズ1の分析結果
${step1Data.summary}

### 収集した重要記事（重要度順）
${topArticles.map((article: any, idx: number) => `
${idx + 1}. ${article.title}
   - ソース: ${article.source}
   - URL: ${article.url || 'URLなし'}
   - 公開日: ${article.publishDate || '日付不明'}
   - 要約: ${article.summary}
   - ${config.expertise}の視点: ${article.expertPerspective || ''}
`).join('\n')}

### 特定されたバズる機会（上位5件）
${topOpportunities.map((opp: any, i: number) => `
${i + 1}. ${opp.topic}
   - 総合スコア: ${opp.overallScore}
   - ${config.expertise}の視点: ${opp.expertAngle || ''}
   - 理由: ${opp.reasoning || ''}
`).join('\n')}

それぞれのトレンドトピックのバズるポテンシャルを「${config.expertise}」の専門家として評価します。

### 1. ウイルス速度指標の評価
各トレンドについて、「${config.expertise}」の視点から以下を評価してください：
- 検索ボリュームの急増と成長率
- ソーシャルメンションの加速
- 複数プラットフォームの存在
- インフルエンサーの採用
- メディア報道の勢い

### 2. コンテンツアングル識別
「${config.expertise}」の専門家として、実行可能なトレンドごとに独自の角度を特定：
- 反対派視点: 一般的な意見に対して${config.expertise}の観点から異議を唱える
- 専門家分析: ${config.expertise}の専門知識を活かした内部視点
- 個人的な物語: ${config.expertise}の経験に基づく個人的なつながり
- 教育的解説: ${config.expertise}の知識を活かした分かりやすい解説
- 未来予測: ${config.expertise}の視点から次に何が起こるかを予測
- 舞台裏の洞察: ${config.expertise}の経験から見える舞台裏
- 比較分析: ${config.expertise}の観点から過去のイベントとの比較

以下のJSON形式で回答してください：

**重要: すべての内容を日本語で記述してください。英語は使用しないでください。**

{
  "viralVelocity": {
    "metrics": [
      {
        "topic": "...",
        "searchVolume": {"current": 数値, "growth": "XX%"},
        "socialMentions": {"count": 数値, "acceleration": "XX%/hour"},
        "crossPlatform": {"platforms": [...], "reach": 数値},
        "influencerAdoption": {"count": 数値, "totalReach": 数値},
        "mediaVelocity": {"articles": 数値, "momentum": "increasing/stable/decreasing"}
      }
    ]
  },
  "contentAngles": {
    "opportunities": [
      {
        "topic": "...",
        "bestAngles": [
          {
            "type": "contrarian/expert/personal/educational/predictive/behind-scenes/comparative",
            "angle": "具体的な切り口の説明",
            "reasoning": "なぜこの角度が効果的か",
            "expectedEngagement": "high/medium/low"
          }
        ],
        "avoidAngles": ["避けるべき角度と理由"]
      }
    ]
  },
  "topOpportunities": [
    {
      "rank": 1,
      "topic": "...",
      "viralScore": 0.0-1.0,
      "bestAngle": "...",
      "angleReasoning": "${config.expertise}の専門家として、なぜこの角度が最適か",
      "expertUniqueness": "${config.expertise}ならではの独自性",
      "timeWindow": "XX時間以内",
      "specificRecommendation": "${config.platform}で${config.style}を活かした具体的な推奨事項",
      "sourceArticles": [
        {
          "title": "参照した記事タイトル",
          "url": "記事URL",
          "relevance": "${config.expertise}の視点でこの記事をどう活用するか"
        }
      ]
    }
  ],
  "summary": "「${config.expertise}」の専門家としてのStep 2分析サマリー",
  "nextStepMessage": "特定の角度から、最もバズる可能性の高い機会をご紹介します。コンテンツのコンセプトについては、「続行」と入力してください。"
}
`
}