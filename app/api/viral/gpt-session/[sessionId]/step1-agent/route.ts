import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { Agent, run } from '@openai/agents'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// バイラルコンテンツ分析エージェント
const viralAnalysisAgent = new Agent({
  name: 'ViralAnalysisAgent',
  client: openai,
  model: 'gpt-4o',
  instructions: `あなたは、バイラルコンテンツの専門家です。
最新のニュースやトレンドを検索・分析し、バズる可能性の高いコンテンツの機会を特定します。
すべての出力は日本語で行い、JSON形式で返します。`,
  tools: [{ type: 'web_search' }]
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

    console.log('Executing GPT Step 1 with Agents SDK...')
    const startTime = Date.now()

    // エージェントワークフローを実行
    const analysisPrompt = buildAnalysisPrompt(config.config)
    
    const result = await run(
      viralAnalysisAgent,
      analysisPrompt
    )

    const duration = Date.now() - startTime
    
    // 結果を処理
    let analysisResult
    try {
      analysisResult = JSON.parse(result.finalOutput || '{}')
      console.log('Parsed response - articleAnalysis count:', analysisResult.articleAnalysis?.length || 0)
    } catch (parseError) {
      console.error('Failed to parse agent response:', parseError)
      throw new Error('エージェント応答の解析に失敗しました')
    }

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
        tokens: (session.tokens || 0) + (result.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          usedAgentsSDK: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 1,
      response: {
        articleAnalysis: analysisResult.articleAnalysis || [],
        currentEvents: analysisResult.currentEvents,
        socialListening: analysisResult.socialListening,
        viralPatterns: analysisResult.viralPatterns,
        opportunityCount: analysisResult.opportunityCount,
        summary: analysisResult.summary,
        keyPoints: analysisResult.keyPoints || []
      },
      metrics: {
        duration,
        tokens: result.usage?.total_tokens
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: analysisResult.nextStepMessage || `トレンド分析に基づき、今後48時間以内に${analysisResult.opportunityCount}件のバズるチャンスが出現すると特定しました。`
      }
    })

  } catch (error) {
    console.error('GPT Step 1 Agent error:', error)
    
    return NextResponse.json(
      { error: 'Step 1 分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildAnalysisPrompt(config: any) {
  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

## タスク: 最新ニュースを検索してバイラルコンテンツの機会を分析

ウェブ検索ツールを使用して、以下のトピックに関する最新ニュースを検索し、分析してください：
- AI・機械学習の最新動向（OpenAI、Anthropic、Google、Microsoft等）
- AIと働き方・雇用への影響
- テクノロジー業界の重要な発表
- ビジネス界でのAI活用事例
- AI規制・倫理に関する議論

検索結果を分析し、バイラルコンテンツの機会を特定して、以下のJSON形式で結果をまとめてください：

{
  "articleAnalysis": [
    {
      "title": "実際の記事タイトル",
      "source": "実際のメディア名",
      "category": "AI/ビジネス/規制/研究/製品発表等",
      "importance": 0.0-1.0,
      "summary": "この記事の内容を100文字程度で要約",
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
    "techAnnouncements": [],
    "businessNews": []
  },
  "socialListening": {
    "twitter": {"trends": [], "velocity": 0.0-1.0},
    "reddit": {"hotPosts": [], "sentiment": "..."}
  },
  "viralPatterns": {
    "topOpportunities": [
      {
        "topic": "具体的なトピック名",
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
    ]
  },
  "opportunityCount": 数値,
  "summary": "全体的な分析サマリー（200文字程度）",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3", "ポイント4", "ポイント5"],
  "nextStepMessage": "メッセージ"
}

**重要: すべての内容を日本語で記述してください。**
`
}