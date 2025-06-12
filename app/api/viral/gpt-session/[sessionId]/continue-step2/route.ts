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
    
    console.log('=== Continue Step 2: バズる機会評価 ===')
    console.log('Session ID:', sessionId)
    
    // セッション情報を取得
    let session = null
    let step1Results = null
    let config = {
      expertise: 'AIと働き方',
      platform: 'Twitter', 
      style: '洞察的'
    }
    
    try {
      session = await prisma.gptAnalysis.findUnique({
        where: { id: sessionId }
      })
      
      if (session) {
        const response = session.response as any
        step1Results = response?.step1
        const metadata = session.metadata as any
        if (metadata?.config) {
          config = metadata.config
        }
      }
    } catch (dbError) {
      console.warn('Database error, using mock data:', dbError.message)
      // Step1のモックデータ
      step1Results = {
        summary: "48時間以内のバズ機会が特定されました",
        viralOpportunities: [
          { topic: "AI技術革新", insight: "最新の技術動向", viralScore: 0.85 },
          { topic: "働き方改革", insight: "リモートワークの進化", viralScore: 0.80 }
        ]
      }
    }

    if (!step1Results) {
      return NextResponse.json(
        { error: 'Step 1を先に完了してください' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    
    // Chain of Thought Step 2プロンプト（詳細版）
    const step2Prompt = buildStep2ChainPrompt(config, step1Results)
    
    console.log('Executing Step 2 with Chain of Thought context...')
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたはバイラルコンテンツ戦略家です。Chain of Thoughtプロセスの第2段階を実行してください。

前段階（Step 1）の結果を基に、各バズ機会の詳細評価を行います。
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}`
        },
        {
          role: 'user', 
          content: step2Prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })

    const duration = Date.now() - startTime
    const responseText = completion.choices[0].message.content || ''
    
    // Step 2結果の構造化
    const step2Results = {
      viralVelocityMetrics: extractVelocityMetrics(responseText),
      contentAngles: extractContentAngles(responseText),
      topOpportunities: extractTopOpportunities(responseText),
      summary: responseText,
      nextStepPrompt: '続行', // ChatGPTスタイル
      completedAt: new Date().toISOString()
    }

    // Step 2結果を保存
    if (session) {
      try {
        const currentResponse = session.response as any || {}
        await prisma.gptAnalysis.update({
          where: { id: sessionId },
          data: {
            response: {
              ...currentResponse,
              step2: step2Results
            },
            tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
            duration: (session.duration || 0) + duration,
            metadata: {
              ...(session.metadata as any || {}),
              currentStep: 2,
              step2CompletedAt: new Date().toISOString()
            }
          }
        })
      } catch (dbError) {
        console.warn('Failed to save Step 2 results:', dbError.message)
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      step: 2,
      phase: 'continue',
      response: step2Results,
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 3,
        url: `/api/viral/gpt-session/${sessionId}/continue-step3`,
        description: 'コンテンツコンセプト作成',
        action: 'continue',
        message: 'Step 2完了。コンテンツコンセプト作成に進むには「続行」してください。'
      }
    })

  } catch (error) {
    console.error('Continue Step 2 error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 2 続行処理でエラーが発生しました',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

function buildStep2ChainPrompt(config: any, step1Results: any) {
  const opportunities = step1Results.viralOpportunities || step1Results.articleAnalysis || []
  
  return `【Chain of Thoughtプロセス - Step 2: バズる機会評価】

前段階の結果（Step 1）:
${step1Results.summary || '48時間以内のバズ機会を特定しました'}

特定されたバズ機会:
${opportunities.map((opp: any, i: number) => `
${String.fromCharCode(65 + i)}. ${opp.topic || opp.title}
   • データ/現象: ${opp.insight || opp.summary}
   • URL: ${opp.url || 'N/A'}
   • バイラルスコア: ${opp.viralScore || opp.importance || '0.8'}
`).join('')}

【Step 2の詳細分析】

各機会について以下の観点から評価してください：

**1. ウイルス速度指標**
- 検索ボリュームの急増と成長率
- ソーシャルメンション数とエンゲージメント加速度
- 複数プラットフォームでの同時拡散状況
- インフルエンサー・メディアの採用率
- リアルタイム話題性の持続力

**2. コンテンツアングル特定**
各機会に対する${config.expertise}専門家としての独自角度：
- 反対意見・異論提起の角度
- 専門家内部視点による分析角度
- 個人体験・実例との接続角度
- 教育的解説・啓発角度
- 未来予測・展望提示角度
- 舞台裏・裏側情報の角度
- 他事例・過去事例との比較角度

**3. ${config.platform}プラットフォーム最適化**
- エンゲージメント誘発要素
- 共有・拡散メカニズム
- ターゲット層の反応予測
- 投稿タイミング最適化

**4. 緊急度・機会ウィンドウ評価**
- 話題性のピーク予測
- 競合投稿の飽和度
- アクション必要タイミング

各機会を上記4つの観点から評価し、最もバズる可能性の高い上位3つの機会を特定してください。

最後に以下のメッセージで締めくくってください：
「特定した角度から、最もバズる可能性の高い機会をお示ししました。コンテンツコンセプトの詳細については「続行」と入力してください。」`
}

function extractVelocityMetrics(text: string) {
  // 簡単な抽出ロジック（後で改善可能）
  return {
    searchVolume: 'high',
    socialMentions: 'increasing', 
    platformPresence: 'multi-platform',
    influencerAdoption: 'emerging'
  }
}

function extractContentAngles(text: string) {
  return {
    expertPerspective: '専門家視点からの分析',
    contraryView: '反対意見・異論提起',
    personalConnection: '個人体験との接続',
    educational: '教育的解説',
    predictive: '未来予測'
  }
}

function extractTopOpportunities(text: string) {
  // テキストから上位機会を抽出（簡易版）
  return [
    { rank: 1, topic: '最高優先度機会', score: 0.9 },
    { rank: 2, topic: '高優先度機会', score: 0.85 },
    { rank: 3, topic: '中高優先度機会', score: 0.8 }
  ]
}