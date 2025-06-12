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

    const sessionData = session.response as any
    const metadata = session.metadata as any

    if (!sessionData.step4) {
      return NextResponse.json(
        { error: 'Step 4を先に完了してください' },
        { status: 400 }
      )
    }

    // Step 5: 実行戦略のプロンプト
    const prompt = buildStep5Prompt(metadata.config, sessionData)

    console.log('Executing GPT Step 5 strategy...')
    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${metadata.config.expertise}の専門家で、ソーシャルメディア戦略家です。
生成されたコンテンツを最大限に活用するための実行戦略を立案してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // Step 5の結果を保存
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...sessionData,
          step5: response
        },
        tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...metadata,
          currentStep: 5,
          step5CompletedAt: new Date().toISOString(),
          completed: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 5,
      executionStrategy: response.executionStrategy,
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens,
        totalSessionTokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        totalSessionDuration: (session.duration || 0) + duration
      },
      summary: {
        message: '5段階の分析が完了しました！',
        totalConcepts: sessionData.step3.concepts.length,
        readyToPosts: response.executionStrategy.immediate.readyPosts || 3,
        nextActions: response.executionStrategy.immediate.tasks
      }
    })

  } catch (error) {
    console.error('GPT Step 5 error:', error)
    
    return NextResponse.json(
      { error: 'Step 5 実行戦略でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildStep5Prompt(config: any, sessionData: any) {
  const concepts = sessionData.step3.concepts
  const fullContents = sessionData.step4.fullContents

  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

## 生成されたコンテンツ
${fullContents.map((c: any, i: number) => 
  `コンテンツ${i + 1}: ${concepts[i]?.topic || 'N/A'}
  文字数: ${c.characterCount}
  形式: ${c.format}`
).join('\n\n')}

## タスク: Step 5 - 実行戦略

以下の実装ガイダンスを提供してください：

### 実行タイムライン
- 即時（2～4時間）：コンテンツ作成、ビジュアル準備、プラットフォームのセットアップ
- 投稿期間（4～24時間）: 最適なタイミング、リアルタイム監視、対応戦略
- フォローアップ（24～48時間）：増幅戦術、フォローアップコンテンツ、パフォーマンス分析

### 最適化技術
- リアルタイム調整のためのエンゲージメントの監視
- 関連するバズるコンテンツに関する戦略的なコメント
- 複数プラットフォーム共有で最大限のリーチを実現
- 知名度を高めるためのインフルエンサーとのエンゲージメント

### リスクアセスメント
- 論争リスクとブランドの整合性
- 競争飽和分析
- プラットフォームアルゴリズムの互換性

### 成功指標
- エンゲージメント率とベースライン
- シェア速度とバイラル係数
- クロスプラットフォームパフォーマンス
- フォロワーの増加と視聴者の質

以下のJSON形式で回答してください：

{
  "executionStrategy": {
    "immediate": {
      "timeframe": "2-4時間",
      "tasks": [
        "具体的なタスク1",
        "具体的なタスク2",
        "具体的なタスク3"
      ],
      "priorityOrder": [1, 2, 3],
      "readyPosts": 3
    },
    "postingWindow": {
      "timeframe": "4-24時間",
      "optimalTimes": [
        {"content": 1, "time": "YYYY-MM-DD HH:MM", "reason": "理由"},
        {"content": 2, "time": "YYYY-MM-DD HH:MM", "reason": "理由"},
        {"content": 3, "time": "YYYY-MM-DD HH:MM", "reason": "理由"}
      ],
      "monitoringPlan": "モニタリング計画",
      "responseStrategy": "レスポンス戦略"
    },
    "followUp": {
      "timeframe": "24-48時間",
      "amplificationTactics": ["戦術1", "戦術2"],
      "followUpContent": ["フォローアップ案1", "案2"],
      "performanceAnalysis": "分析計画"
    }
  },
  "optimization": {
    "engagementMonitoring": "エンゲージメント監視方法",
    "strategicComments": ["コメント戦略1", "戦略2"],
    "crossPlatformSharing": ["共有戦略1", "戦略2"],
    "influencerEngagement": ["インフルエンサー戦略"]
  },
  "riskAssessment": {
    "controversyRisk": {
      "level": "low/medium/high",
      "mitigation": "緩和策"
    },
    "competitiveSaturation": {
      "analysis": "競争分析",
      "differentiation": "差別化戦略"
    },
    "algorithmCompatibility": {
      "score": 0.0-1.0,
      "optimization": "最適化方法"
    }
  },
  "successMetrics": {
    "engagementRate": {
      "baseline": "X%",
      "target": "Y%"
    },
    "shareVelocity": {
      "expectedRange": "X-Y shares/hour"
    },
    "crossPlatform": {
      "reach": "予想リーチ"
    },
    "followerGrowth": {
      "expectedRange": "X-Y followers"
    }
  },
  "principles": {
    "speedOverPerfection": "完璧さよりもスピードを重視する理由",
    "authenticityOverOpportunism": "真実性を保つ方法",
    "timingOverBrilliance": "タイミングの重要性",
    "engagementOverReach": "エンゲージメント重視の戦略"
  }
}
`
}