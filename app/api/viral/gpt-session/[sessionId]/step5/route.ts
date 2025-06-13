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

    if (!currentResponse.step4) {
      return NextResponse.json(
        { error: 'Step 4を先に完了してください' },
        { status: 400 }
      )
    }

    // Step 5: 実行戦略のプロンプト
    const prompt = buildStep5Prompt(currentMetadata.config, currentResponse)

    console.log('Executing GPT Step 5 strategy...')
    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: currentMetadata.config.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${currentMetadata.config?.expertise || currentMetadata.expertise || 'AIと働き方'}の専門家で、ソーシャルメディア戦略家です。
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
          ...currentResponse,
          step5: response
        },
        tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
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
      response: {
        executionStrategy: response.executionStrategy,
        optimization: response.optimization,
        riskAssessment: response.riskAssessment,
        successMetrics: response.successMetrics,
        principles: response.principles
      },
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens,
        totalSessionTokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        totalSessionDuration: (session.duration || 0) + duration
      },
      summary: {
        message: '5段階の分析が完了しました！',
        totalConcepts: currentResponse.step3.concepts.length,
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
  
  // Handle nested config structure
  const expertise = config.config?.expertise || config.expertise || 'AIと働き方'
  const platform = config.config?.platform || config.platform || 'Twitter'
  const style = config.config?.style || config.style || '洞察的'

  return `
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ4: 実行戦略

現在時刻: ${new Date().toLocaleString('ja-JP')}

### あなたの設定情報（フェーズ1-3Bから引き継ぎ）：
1. あなたの専門分野または業界: ${expertise}
2. 重点を置くプラットフォーム: ${platform}
3. コンテンツのスタイル: ${style}

### 生成されたコンテンツの概要
${fullContents.map((c: any, i: number) => {
  const articles = c.sourceArticles || []
  return `
コンテンツ${i + 1}: ${concepts[i]?.topic || 'N/A'}
- 文字数: ${c.characterCount}
- 形式: ${c.format}
- ${expertise}の視点: ${concepts[i]?.explanation || ''}
- 参照記事: ${articles.length}件
${articles.map((article: any) => `  • ${article.url || 'URLなし'}`).join('\n')}
`
}).join('\n')}

「${expertise}」の専門家として、実装ガイダンスを提供します。

### 実行タイムライン
- 即時（2～4時間）：
  - ${expertise}の専門性を示すコンテンツの最終調整
  - ${platform}に適したビジュアル準備
  - ${expertise}コミュニティへの事前告知
  
- 投稿期間（4～24時間）:
  - ${expertise}の視点を最大限活かす最適なタイミング
  - ${expertise}コミュニティの反応をリアルタイム監視
  - ${style}に合った対応戦略
  
- フォローアップ（24～48時間）：
  - ${expertise}の専門性を活かした追加コンテンツ
  - ${platform}での継続的な会話の維持
  - ${expertise}視点でのパフォーマンス分析

### 最適化技術
- ${expertise}コミュニティのエンゲージメント監視
- ${expertise}の視点から関連コンテンツへの戦略的コメント
- ${expertise}の専門性を活かした複数プラットフォーム展開
- ${expertise}分野のインフルエンサーとのエンゲージメント

### リスクアセスメント
- ${expertise}の専門性と論争リスクのバランス
- ${expertise}分野での競争飽和分析
- ${platform}アルゴリズムと${expertise}コンテンツの相性

### 成功指標
- ${expertise}コミュニティでのエンゲージメント率
- ${expertise}関連のシェア速度とバイラル係数
- ${platform}での${expertise}フォロワーの増加
- ${expertise}に興味を持つ質の高い視聴者の獲得

以下のJSON形式で回答してください：

**重要: すべての内容を日本語で記述してください。英語は使用しないでください。**

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
    "speedOverPerfection": "${config.expertise}の視点で、完璧さよりもスピードを重視する理由",
    "authenticityOverOpportunism": "${config.expertise}の専門家として真実性を保つ方法",
    "timingOverBrilliance": "${config.expertise}分野でのタイミングの重要性",
    "engagementOverReach": "${config.expertise}コミュニティでのエンゲージメント重視戦略"
  },
  "conclusion": "品質を維持しながら迅速に実行します。バズるウィンドウはすぐに閉じますが、${config.expertise}の専門家として適切なコンテンツを適切なタイミングで提供することで、リーチを飛躍的に拡大できます。"
}

ウイルス予測の原則:
- 完璧さよりもスピード - ${config.expertise}分野でもウイルスの窓は狭い
- 機会主義よりも真実性 - ${config.expertise}の専門性を活かした本物のコンテンツ
- 才能よりもタイミング - ${config.expertise}の視点でトレンドに乗る
- リーチよりもエンゲージメント - ${config.expertise}コミュニティでのシェアとコメントに重点
`
}