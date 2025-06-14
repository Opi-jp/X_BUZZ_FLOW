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
    const step1Data = (session.response as any)?.step1

    if (!step1Data) {
      return NextResponse.json(
        { error: 'Step 1のデータが見つかりません。まずStep 1を実行してください。' },
        { status: 400, headers }
      )
    }

    console.log('=== Step 2: Chain of Thought + Function Calling ===')
    console.log('Session ID:', sessionId)
    console.log('Available viral opportunities:', step1Data.viralPatterns?.topOpportunities?.length || 0)

    const startTime = Date.now()

    // Function Definition for trend analysis
    const trendAnalysisFunction = {
      name: 'analyze_viral_trends',
      description: 'バイラル機会を詳細に分析し、エンゲージメント予測を行う',
      parameters: {
        type: 'object',
        properties: {
          opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                topic: { type: 'string', description: 'トピックタイトル' },
                controversy_level: { type: 'number', description: '論争レベル（0-1）' },
                emotion_intensity: { type: 'number', description: '感情の強さ（0-1）' },
                relatability_factor: { type: 'number', description: '共感性要因（0-1）' },
                shareability: { type: 'number', description: '共有可能性（0-1）' },
                timing_sensitivity: { type: 'number', description: 'タイミング敏感性（0-1）' },
                platform_alignment: { type: 'number', description: 'プラットフォーム適合性（0-1）' },
                viral_velocity: { type: 'string', description: '拡散速度予測（slow/medium/fast/explosive）' },
                content_angle: { type: 'string', description: '最適なコンテンツアングル' },
                opportunity_window: { type: 'string', description: '機会ウィンドウ（時間枠）' },
                target_emotion: { type: 'string', description: '狙う感情（surprise/anger/joy/outrage/curiosity）' },
                engagement_prediction: { type: 'number', description: 'エンゲージメント予測スコア（0-1）' }
              },
              required: ['topic', 'controversy_level', 'emotion_intensity', 'relatability_factor', 'shareability', 'timing_sensitivity', 'platform_alignment', 'viral_velocity', 'content_angle', 'opportunity_window', 'target_emotion', 'engagement_prediction']
            }
          },
          overall_assessment: {
            type: 'object',
            properties: {
              best_opportunity: { type: 'string', description: '最高のバズ機会' },
              recommended_timeline: { type: 'string', description: '推奨タイムライン' },
              risk_factors: { type: 'array', items: { type: 'string' }, description: 'リスク要因' },
              success_factors: { type: 'array', items: { type: 'string' }, description: '成功要因' }
            },
            required: ['best_opportunity', 'recommended_timeline', 'risk_factors', 'success_factors']
          }
        },
        required: ['opportunities', 'overall_assessment']
      }
    }

    // Chain of Thought プロンプト構築
    const cotPrompt = buildChainOfThoughtPrompt(config, step1Data)

    // GPT-4o Function Calling実行
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。
          
Chain of Thought（段階的思考）に従って、以下の手順で分析を進めてください：

1. **現状認識** - 提供された機会を整理
2. **深層分析** - 各機会の6つの軸（論争・感情・共感・共有・タイミング・プラットフォーム適合）での評価
3. **拡散予測** - プラットフォーム特性を考慮した拡散速度とエンゲージメント予測
4. **戦略決定** - 最適な機会とアプローチの決定

必ずanalyze_viral_trends関数を呼び出して、構造化された分析結果を返してください。`
        },
        {
          role: 'user',
          content: cotPrompt
        }
      ],
      functions: [trendAnalysisFunction],
      function_call: { name: 'analyze_viral_trends' },
      temperature: 0.7,
      max_tokens: 4000
    })

    const duration = Date.now() - startTime
    console.log('API call duration:', duration, 'ms')

    // Function Callingの結果を取得
    const functionCall = response.choices[0]?.message?.function_call
    let analysisResult = null

    if (functionCall && functionCall.name === 'analyze_viral_trends') {
      try {
        analysisResult = JSON.parse(functionCall.arguments)
        console.log('Function calling successful:', Object.keys(analysisResult))
      } catch (e) {
        console.error('Failed to parse function arguments:', e)
        return NextResponse.json(
          { error: 'Function Callingの結果解析に失敗しました' },
          { status: 500, headers }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Function Callingが実行されませんでした' },
        { status: 500, headers }
      )
    }

    // 結果をデータベースに保存
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...(session.response as any || {}),
          step2: analysisResult
        },
        tokens: (session.tokens || 0) + (response.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...(session.metadata as any || {}),
          currentStep: 2,
          step2CompletedAt: new Date().toISOString(),
          usedFunctionCalling: true,
          cotImplementation: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 2,
      method: 'Chain of Thought + Function Calling',
      response: analysisResult,
      metrics: {
        duration,
        tokensUsed: response.usage?.total_tokens || 0,
        opportunitiesAnalyzed: analysisResult.opportunities?.length || 0,
        bestOpportunity: analysisResult.overall_assessment?.best_opportunity
      },
      nextStep: {
        step: 3,
        url: `/api/viral/gpt-session/${sessionId}/step3`,
        description: 'コンテンツコンセプト生成',
        message: `${analysisResult.opportunities?.length || 0}個の機会を分析しました。次はコンテンツ生成に進みます。`
      }
    }, { headers })

  } catch (error) {
    console.error('Step 2 CoT error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 2 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildChainOfThoughtPrompt(config: any, step1Data: any) {
  const opportunities = step1Data.viralPatterns?.topOpportunities || []
  const currentDateJST = new Date().toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })
  
  const expertise = config.expertise
  const platform = config.platform
  const style = config.style

  return `## フェーズ2: バズる機会評価

それぞれのトレンドトピックのバズるポテンシャルを評価します。

設定情報:
- 発信したい分野: ${expertise}
- プラットフォーム: ${platform}
- コンテンツのスタイル: ${style}

**ステップ1で特定されたバズ機会:**
${opportunities.map((opp: any, index: number) => `
${index + 1}. ${opp.topic}
   - 専門家視点: ${opp.expertAngle}
   - 理由: ${opp.reasoning}
   - 初期スコア: ${opp.overallScore}
`).join('\n')}

ウイルス速度指標
- 検索ボリュームの急増と成長率
- ソーシャルメンションの加速
- 複数プラットフォームの存在
- インフルエンサーの採用
- メディア報道の勢い

コンテンツアングル識別
実行可能なトレンドごとに、独自の角度を特定します。
- 反対派は世論に異議を唱える
- 専門家による内部視点の分析
- 個人的なつながりの物語
- 教育の内訳
- 次に何が起こるかを予測するコンテンツ
- 舞台裏の洞察
- 過去のイベントとの比較内容

この分析を基に、analyze_viral_trends関数を呼び出して構造化された結果を提供してください。

特に${config?.expertise || 'AI × 働き方'}の視点から、48時間以内に実行可能な最高のバズ機会を特定し、${config?.platform || 'Twitter'}での成功確率が最も高いアプローチを推奨してください。`
}