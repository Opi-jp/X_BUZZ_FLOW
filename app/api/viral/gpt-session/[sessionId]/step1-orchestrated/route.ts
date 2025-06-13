import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Google Custom Search API（または他の検索API）
async function executeSearch(query: string): Promise<any[]> {
  // 実装例（実際のAPIキーとエンドポイントが必要）
  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${encodeURIComponent(query)}`
  )
  const data = await response.json()
  return data.items || []
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const startTime = Date.now()

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

    const metadata = session.metadata as any
    const config = metadata?.config || {}

    console.log('=== Orchestrated Step 1: 3-Phase Approach ===')

    // ============================================
    // ステップ1: 検索クエリ生成フェーズ
    // ============================================
    console.log('Phase 1: Generating search queries...')
    
    const queryGenerationResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、優秀なリサーチアシスタントです。
バズるコンテンツを見つけるために、最適な検索戦略を立案します。`
        },
        {
          role: 'user',
          content: `
# 命令
以下のユーザー入力とリサーチ要件に基づいて、効果的な検索クエリを生成してください。
クエリは、具体的なニュース、技術トレンド、SNSでの言及を捉えるために、多様な視点を含めてください。

# ユーザー入力
* 発信したい分野: ${config.expertise}
* コンテンツのスタイル: ${config.style}
* プラットフォーム: ${config.platform}

# リサーチ要件
* A：現在の出来事の分析（最新ニュース、有名人の事件、政治的展開）
* B：テクノロジーの発表とビジネスドラマ
* C：ソーシャルリスニング研究（Twitter, Reddit, YouTube）

# 検索クエリ生成の指針
1. 時間指定を含める（"2025年6月", "最新", "today"など）
2. 専門分野に関連するキーワードを含める
3. SNS特有の検索（site:指定など）も活用
4. 日本語と英語の両方を考慮

# 出力形式
{
  "queries": [
    "検索クエリ1",
    "検索クエリ2",
    ...（最大10個）
  ],
  "reasoning": "なぜこれらのクエリを選んだかの説明"
}
`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const queryGenResult = JSON.parse(queryGenerationResponse.choices[0].message.content || '{}')
    console.log(`Generated ${queryGenResult.queries?.length || 0} search queries`)

    // ============================================
    // ステップ2: 検索実行フェーズ
    // ============================================
    console.log('Phase 2: Executing searches...')
    
    const searchResults = []
    for (const query of queryGenResult.queries || []) {
      try {
        // 実際の検索実行（Google Custom Search、Bing、または他のAPI）
        const results = await executeSearch(query)
        searchResults.push({
          query,
          results: results.slice(0, 5).map(item => ({
            title: item.title,
            snippet: item.snippet,
            url: item.link,
            source: new URL(item.link).hostname
          }))
        })
      } catch (error) {
        console.error(`Search failed for query: ${query}`, error)
      }
    }

    // 検索結果を要約形式に変換
    const searchResultText = searchResults.map(sr => 
      `検索クエリ: "${sr.query}"\n結果:\n` +
      sr.results.map((r, i) => 
        `${i + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}`
      ).join('\n')
    ).join('\n\n---\n\n')

    // ============================================
    // ステップ3: 統合・分析フェーズ
    // ============================================
    console.log('Phase 3: Analyzing and integrating results...')
    
    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。`
        },
        {
          role: 'user',
          content: `
# 命令
以下の検索結果に基づいて、トレンド分析を行い、今後48時間以内に出現すると予測されるバズるチャンスを特定してください。

# ユーザー設定
* 発信したい分野: ${config.expertise}
* コンテンツのスタイル: ${config.style}
* プラットフォーム: ${config.platform}

# 検索で使用したクエリの意図
${queryGenResult.reasoning || '複数の視点から最新トレンドを収集'}

# 収集した検索結果
${searchResultText}

# 分析の視点
A. 現在の出来事の分析
- 何が今話題になっているか
- どのような議論が起きているか

B. テクノロジーとビジネス動向
- 新しい発表や発見
- 業界の変化

C. ソーシャルリスニング
- SNSでの反応や感情
- 共有されているコンテンツの特徴

D. バイラルパターン認識
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォーム調整（${config.platform}文化に適合）

# 出力形式
以下のJSON形式で、分析結果をまとめてください：
{
  "trendAnalysis": {
    "currentEvents": ["重要な出来事1", "重要な出来事2", ...],
    "techBusiness": ["技術/ビジネストレンド1", ...],
    "socialListening": ["SNSでの話題1", ...]
  },
  "opportunities": [
    {
      "topic": "トピック名",
      "reasoning": "なぜバズる可能性があるか",
      "viralScore": 0.0-1.0,
      "urgency": "high/medium/low",
      "angle": "取るべき角度"
    }
  ],
  "opportunityCount": 数値,
  "summary": "全体的な分析サマリー",
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内にX件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。"
}
`
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

    const analysisResult = JSON.parse(analysisResponse.choices[0].message.content || '{}')
    const duration = Date.now() - startTime

    // 結果を保存
    const currentResponse = session.response as Record<string, any> || {}
    const currentMetadata = session.metadata as Record<string, any> || {}
    
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step1: {
            ...analysisResult,
            searchQueries: queryGenResult.queries,
            queryReasoning: queryGenResult.reasoning,
            searchResultsCount: searchResults.reduce((sum, sr) => sum + sr.results.length, 0)
          }
        },
        tokens: (session.tokens || 0) + 
                (queryGenerationResponse.usage?.total_tokens || 0) + 
                (analysisResponse.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          orchestratedApproach: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      sessionId,
      step: 1,
      method: 'Orchestrated 3-Phase Approach',
      response: analysisResult,
      metrics: {
        duration,
        phases: {
          queryGeneration: queryGenerationResponse.usage?.total_tokens || 0,
          searchExecution: searchResults.length,
          analysis: analysisResponse.usage?.total_tokens || 0
        },
        totalQueries: queryGenResult.queries?.length || 0,
        totalResults: searchResults.reduce((sum, sr) => sum + sr.results.length, 0)
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'バズる機会評価',
        message: analysisResult.nextStepMessage
      }
    })

  } catch (error) {
    console.error('Orchestrated Step 1 error:', error)
    
    return NextResponse.json(
      { 
        error: 'Step 1 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}