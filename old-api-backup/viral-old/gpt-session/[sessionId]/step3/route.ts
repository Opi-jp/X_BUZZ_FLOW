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
    
    // Vercelタイムアウト対策: レスポンスヘッダー設定
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }

    // セッション情報を取得
    const session = await prisma.gptAnalysis.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404, headers }
      )
    }

    const metadata = session.metadata as any
    const config = metadata?.config || {}
    const step2Data = (session.response as any)?.step2

    if (!step2Data) {
      return NextResponse.json(
        { error: 'Step 2のデータが見つかりません。まずStep 2を実行してください。' },
        { status: 400, headers }
      )
    }

    console.log('=== Step 3: Content Concept Creation with Function Calling ===')
    console.log('Session ID:', sessionId)
    console.log('Opportunities to process:', step2Data.opportunities?.length || 0)

    const startTime = Date.now()

    // Function Definition for content concept creation
    const contentConceptFunction = {
      name: 'create_viral_content_concepts',
      description: 'バイラル機会から具体的な投稿コンセプトを3つ生成する',
      parameters: {
        type: 'object',
        properties: {
          concepts: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: '対象トピック' },
                title: { type: 'string', description: 'コンセプトタイトル' },
                hook: { type: 'string', description: '注目を集めるオープニングフック（20-30文字）' },
                angle: { type: 'string', description: '専門家ならではの独自視点' },
                platform: { type: 'string', description: 'プラットフォーム' },
                format: { type: 'string', enum: ['single', 'thread', 'video'], description: '投稿形式' },
                content_outline: {
                  type: 'object',
                  properties: {
                    opening_hook: { type: 'string', description: 'オープニングフック詳細' },
                    key_points: { type: 'array', items: { type: 'string' }, description: '専門知識を活かしたポイント' },
                    unexpected_insight: { type: 'string', description: '専門家だからこその洞察' },
                    cta: { type: 'string', description: 'エンゲージメントCTA' }
                  },
                  required: ['opening_hook', 'key_points', 'unexpected_insight', 'cta']
                },
                timing: { type: 'string', description: '最適投稿タイミング' },
                visual_description: { type: 'string', description: 'ビジュアルガイド' },
                hashtags: { type: 'array', items: { type: 'string' }, description: 'ハッシュタグ' },
                target_audience: { type: 'string', description: 'ターゲット層' },
                buzz_factors: { type: 'array', items: { type: 'string' }, description: 'バズ要因' },
                estimated_engagement: {
                  type: 'object',
                  properties: {
                    likes: { type: 'string', description: 'いいね予測' },
                    retweets: { type: 'string', description: 'RT予測' },
                    replies: { type: 'string', description: 'リプライ予測' }
                  }
                },
                risk_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'リスクレベル' },
                confidence_score: { type: 'number', description: '成功確信度（0-1）' }
              },
              required: ['topic', 'title', 'hook', 'angle', 'platform', 'format', 'content_outline', 'timing', 'visual_description', 'hashtags', 'target_audience', 'buzz_factors', 'estimated_engagement', 'risk_level', 'confidence_score']
            }
          },
          strategic_summary: {
            type: 'object',
            properties: {
              recommended_concept: { type: 'string', description: '最推奨コンセプト' },
              execution_priority: { type: 'array', items: { type: 'string' }, description: '実行優先順位' },
              timing_strategy: { type: 'string', description: 'タイミング戦略' },
              risk_mitigation: { type: 'array', items: { type: 'string' }, description: 'リスク軽減策' }
            },
            required: ['recommended_concept', 'execution_priority', 'timing_strategy', 'risk_mitigation']
          }
        },
        required: ['concepts', 'strategic_summary']
      }
    }

    // Chain of Thought プロンプト構築
    const cotPrompt = buildContentConceptPrompt(config, step2Data)

    // GPT-4o Function Calling実行
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ3: バズるコンテンツのコンセプト作成

具体的で実行可能なコンテンツコンセプトを作成します。

Step 2で特定された機会に基づいて、3つの異なるコンセプトを開発してください。

必ずcreate_viral_content_concepts関数を呼び出して、構造化されたコンセプトを返してください。`
        },
        {
          role: 'user',
          content: cotPrompt
        }
      ],
      functions: [contentConceptFunction],
      function_call: { name: 'create_viral_content_concepts' },
      temperature: 0.8,
      max_tokens: 4000
    })

    const duration = Date.now() - startTime
    console.log('API call duration:', duration, 'ms')

    // Function Callingの結果を取得
    const functionCall = response.choices[0]?.message?.function_call
    let conceptResult = null

    if (functionCall && functionCall.name === 'create_viral_content_concepts') {
      try {
        conceptResult = JSON.parse(functionCall.arguments)
        console.log('Content concepts generated:', conceptResult.concepts?.length || 0)
        
        // デバッグ用：最初のコンセプトの構造を確認
        if (conceptResult.concepts && conceptResult.concepts.length > 0) {
          const firstConcept = conceptResult.concepts[0]
          console.log('First concept keys:', Object.keys(firstConcept))
          console.log('buzz_factors:', firstConcept.buzz_factors)
          console.log('buzz_factors type:', Array.isArray(firstConcept.buzz_factors) ? 'array' : typeof firstConcept.buzz_factors)
        }
      } catch (e) {
        console.error('Failed to parse concept function arguments:', e)
        return NextResponse.json(
          { error: 'コンセプト生成の結果解析に失敗しました' },
          { status: 500, headers }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'コンセプト生成Function Callingが実行されませんでした' },
        { status: 500, headers }
      )
    }

    // 結果をデータベースに保存
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...(session.response as any || {}),
          step3: conceptResult
        },
        tokens: (session.tokens || 0) + (response.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...(session.metadata as any || {}),
          currentStep: 3,
          step3CompletedAt: new Date().toISOString(),
          usedFunctionCalling: true,
          conceptsGenerated: conceptResult.concepts?.length || 0
        }
      }
    })

    // コンセプトを下書きとして保存
    const drafts = await Promise.all(
      (conceptResult.concepts || []).map(async (concept: any, index: number) => {
        // buzzFactorsとhashtagsが確実に配列であることを保証
        let buzzFactors: string[] = []
        if (Array.isArray(concept.buzz_factors)) {
          buzzFactors = concept.buzz_factors
            .filter((f: any) => f != null)
            .map((f: any) => String(f))
        }
        
        let hashtags: string[] = []
        if (Array.isArray(concept.hashtags)) {
          hashtags = concept.hashtags
            .filter((h: any) => h != null)
            .map((h: any) => String(h))
        }
        
        return await prisma.contentDraft.create({
          data: {
            analysisId: sessionId,
            conceptType: concept.format || 'single',
            category: concept.topic || 'その他',
            title: concept.title || '無題',
            content: concept.hook || '',
            explanation: concept.angle || '',
            buzzFactors: buzzFactors.length > 0 ? buzzFactors : ['一般的な関心'],
            targetAudience: concept.target_audience || '一般',
            estimatedEngagement: concept.estimated_engagement || {},
            hashtags: hashtags.length > 0 ? hashtags : ['#AI', '#働き方'],
            metadata: {
              conceptNumber: index + 1,
              platform: concept.platform,
              format: concept.format,
              angle: concept.angle,
              timing: concept.timing,
              visualDescription: concept.visual_description,
              contentOutline: concept.content_outline,
              riskLevel: concept.risk_level,
              confidenceScore: concept.confidence_score
            }
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      sessionId,
      step: 3,
      method: 'Chain of Thought + Function Calling',
      response: conceptResult,
      draftsCreated: drafts.length,
      metrics: {
        duration,
        tokensUsed: response.usage?.total_tokens || 0,
        conceptsGenerated: conceptResult.concepts?.length || 0,
        recommendedConcept: conceptResult.strategic_summary?.recommended_concept
      },
      nextStep: {
        step: 4,
        url: `/api/viral/gpt-session/${sessionId}/step4`,
        description: '完全な投稿可能コンテンツ生成',
        message: `${conceptResult.concepts?.length || 0}個のコンセプトを生成しました。完全な投稿コンテンツの作成に進みます。`
      }
    }, { headers })

  } catch (error) {
    console.error('Step 3 CoT error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 3 コンセプト作成でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildContentConceptPrompt(config: any, step2Data: any) {
  const opportunities = step2Data.opportunities || []
  const bestOpportunity = step2Data.overall_assessment?.best_opportunity
  const currentDateJST = new Date().toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })
  
  const expertise = config.expertise
  const platform = config.platform
  const style = config.style

  return `**Chain of Thought: バイラルコンテンツコンセプト生成**

設定情報:
- 専門分野: ${expertise}
- プラットフォーム: ${platform}
- スタイル: ${style}
- 現在時刻: ${currentDateJST}

**Step 2 分析結果:**
最高のバズ機会: ${bestOpportunity}
推奨タイムライン: ${step2Data.overall_assessment?.recommended_timeline}

**分析された機会一覧:**
${opportunities.slice(0, 3).map((opp: any, index: number) => `
${index + 1}. ${opp.topic}
   - 論争レベル: ${opp.controversy_level}
   - 感情の強さ: ${opp.emotion_intensity}
   - 共感性: ${opp.relatability_factor}
   - 共有可能性: ${opp.shareability}
   - タイミング敏感性: ${opp.timing_sensitivity}
   - プラットフォーム適合性: ${opp.platform_alignment}
   - 拡散速度予測: ${opp.viral_velocity}
   - コンテンツアングル: ${opp.content_angle}
   - ターゲット感情: ${opp.target_emotion}
   - エンゲージメント予測: ${opp.engagement_prediction}
`).join('\n')}

コンテンツコンセプトフレームワーク
それぞれの機会について、以下を開発します:

プラットフォーム: [最適化されたプラットフォーム]
形式: [スレッド/ビデオ/投稿タイプ]
フック: 「[注目を集める具体的なオープナー]」
角度: [独自の視点や見方]
コンテンツ概要:
  - トレンドにつながるオープニングフック
  - [物語を構築する3～5つのキーポイント]
  - 予期せぬ洞察や啓示
  - エンゲージメントを促進するCTA
タイミング: 最大の効果を得るには [X] 時間以内に投稿してください
ビジュアル: [具体的な画像/動画の説明]
ハッシュタグ: [プラットフォームに最適化されたタグ]

この構造に従って 3 つのコンセプトを提供します。

create_viral_content_concepts関数を呼び出して、構造化された結果を返してください。

次のように伝えます。「バズるコンテンツのコンセプトの概要は次のとおりです。「続行」と入力すると、各コンセプトの完全な、すぐに投稿できるコンテンツが表示されます。」`
}