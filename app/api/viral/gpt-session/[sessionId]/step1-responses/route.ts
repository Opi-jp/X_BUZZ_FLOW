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

    const config = session.metadata as any

    console.log('Executing GPT Step 1 with Responses API and web search...')
    const startTime = Date.now()

    // モデルがGPT-4oかチェック（web_searchはGPT-4oのみサポート）
    const selectedModel = config.config.model || 'gpt-4o'
    const supportsWebSearch = selectedModel === 'gpt-4o'
    
    if (!supportsWebSearch) {
      return NextResponse.json(
        { error: 'Web検索はGPT-4oモデルのみサポートされています。GPT-4oを選択してください。' },
        { status: 400 }
      )
    }

    // Responses APIを使用してウェブ検索を実行
    const response = await openai.responses.create({
      model: selectedModel,
      input: buildPrompt(config.config),
      tools: [
        {
          type: 'web_search'
        }
      ],
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    
    // レスポンスを処理
    const rawResponse = response.content || '{}'
    console.log('GPT Step 1 response length:', rawResponse.length)
    
    let analysisResult
    try {
      analysisResult = JSON.parse(rawResponse)
      console.log('Parsed response - articleAnalysis count:', analysisResult.articleAnalysis?.length || 0)
    } catch (parseError) {
      console.error('Failed to parse GPT response:', parseError)
      console.error('Raw response:', rawResponse.substring(0, 500))
      throw new Error('GPT応答の解析に失敗しました')
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
        tokens: (session.tokens || 0) + (response.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          usedResponsesAPI: true
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
        tokens: response.usage?.total_tokens
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: analysisResult.nextStepMessage || `トレンド分析に基づき、今後48時間以内に${analysisResult.opportunityCount}件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。`
      }
    })

  } catch (error) {
    console.error('GPT Step 1 error:', error)
    
    return NextResponse.json(
      { error: 'Step 1 分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildPrompt(config: any) {
  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

## タスク: Step 1 - データ収集・初期分析

ウェブ検索を使用して、以下に関する最新のニュースやトレンドを調査してください：

1. AI・機械学習の最新動向（OpenAI、Anthropic、Google、Microsoft等）
2. AIと働き方・雇用への影響に関する議論
3. テクノロジー業界の重要な発表や動き
4. ビジネス界でのAI活用事例
5. AI規制・倫理に関する最新の議論
6. その他、現在話題になっているテック関連ニュース

検索した記事を分析し、以下の観点で包括的な分析を行ってください：

### 1. 現在の出来事の分析
以下の8カテゴリで現在起きている重要な出来事を分析：
- 最新ニュースと最新ニュース
- 有名人の事件と世間の反応
- 政治的展開が議論を巻き起こす
- テクノロジーの発表とテクノロジードラマ
- ビジネスニュースと企業論争
- 文化的瞬間と社会運動
- スポーツイベントと予想外の結果
- インターネットドラマとプラットフォーム論争

### 2. ソーシャルリスニング研究
以下のプラットフォームでの動向を分析（実際のデータまたは推測）：
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

### 3. ウイルスパターン認識
各トピックを以下の6軸で評価（0-1のスコア）：
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォームの調整（プラットフォーム文化に適合）

以下のJSON形式で回答してください。
**重要: すべての内容を日本語で記述してください。英語は使用しないでください。**
**重要: 検索した実際の記事に基づいて、10-15件程度の具体的な記事分析をarticleAnalysis配列に含めてください。**

{
  "articleAnalysis": [
    {
      "title": "実際の記事タイトル",
      "source": "実際のメディア名",
      "category": "AI/ビジネス/規制/研究/製品発表等",
      "importance": 0.0-1.0,
      "summary": "この記事の内容を100文字程度で要約",
      "keyPoints": [
        "重要ポイント1（具体的に）",
        "重要ポイント2（具体的に）",
        "重要ポイント3（具体的に）"
      ],
      "viralPotential": "なぜこの記事がバズる可能性があるか（具体的な理由）"
    }
  ],
  "currentEvents": {
    "latestNews": [{"title": "...", "impact": 0.0-1.0, "category": "..."}],
    "celebrityEvents": [...],
    "politicalDevelopments": [...],
    "techAnnouncements": [...],
    "businessNews": [...],
    "culturalMoments": [...],
    "sportsEvents": [...],
    "internetDrama": [...]
  },
  "socialListening": {
    "twitter": {"trends": [...], "velocity": 0.0-1.0},
    "tiktok": {"sounds": [...], "challenges": [...]},
    "reddit": {"hotPosts": [...], "sentiment": "..."},
    "googleTrends": {"risingQueries": [...]},
    "youtube": {"trendingTopics": [...]},
    "newsComments": {"sentiment": "...", "volume": 0.0-1.0},
    "socialEngagement": {"patterns": [...]}
  },
  "viralPatterns": {
    "topOpportunities": [
      {
        "topic": "具体的なトピック名（日本語）",
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
      // 最低5件、最大10件のバズる機会を特定してください
    ]
  },
  "opportunityCount": 数値,
  "summary": "全体的な分析サマリー（200文字程度）",
  "keyPoints": [
    "重要なポイント1",
    "重要なポイント2",
    "重要なポイント3",
    "重要なポイント4",
    "重要なポイント5"
  ],
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内に[X]件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。"
}
`
}