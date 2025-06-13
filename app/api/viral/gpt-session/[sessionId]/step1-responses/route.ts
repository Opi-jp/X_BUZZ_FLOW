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
          type: 'web_search' as any
        }
      ],
      instructions: `必ずJSON形式で回答してください。web_searchツールを使用して実際のニュース記事を検索し、各記事の実際のURLを含めてください。`
    } as any)

    const duration = Date.now() - startTime
    
    // レスポンスを処理
    let rawResponse = ''
    if (Array.isArray(response)) {
      // メッセージを探す
      const messageItem = response.find((item: any) => item.type === 'message')
      if (messageItem && messageItem.content && messageItem.content[0]) {
        rawResponse = messageItem.content[0].text || ''
      }
    } else {
      rawResponse = (response as any).output || JSON.stringify(response)
    }
    
    console.log('GPT Step 1 response length:', rawResponse.length)
    
    let analysisResult
    try {
      // JSON部分を抽出（必要に応じて）
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse
      analysisResult = JSON.parse(jsonStr)
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
        tokens: (session.tokens || 0) + ((response as any).usage?.total_tokens || 0),
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
        tokens: (response as any).usage?.total_tokens
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
  const today = new Date()
  const formattedDate = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  
  return `
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ1: トレンド情報の収集

現在時刻: ${today.toLocaleString('ja-JP')}
今日の日付: ${formattedDate}

### あなたの設定情報：
1. あなたの専門分野または業界: ${config.config?.expertise || config.expertise || 'AIと働き方'}
2. 重点を置くプラットフォーム: ${config.config?.platform || config.platform || 'Twitter'}
3. コンテンツのスタイル: ${config.config?.style || config.style || '洞察的'}

現在の出来事を分析して、あなたのコンテンツがバズるチャンスを特定します。

【重要な指示】
- あなたは「${config.config?.expertise || config.expertise || 'AIと働き方'}」の専門家として、すべての情報を解釈してください
- web_searchツールを使用して、2025年6月の最新ニュースを検索してください
- 「latest」「today」「June 2025」などの時間指定を検索クエリに含めてください
- 2025年5月31日以降のニュースのみを含めてください
- 必ず各記事の実際のURLを取得し、"url"フィールドに含めてください
- 各カテゴリのニュースを「${config.config?.expertise || config.expertise || 'AIと働き方'}」の視点から解釈し、独自の切り口を見つけてください

### 現在の出来事の分析
以下の8カテゴリから最新のニュースやトレンドを調査し、「${config.config?.expertise || config.expertise || 'AIと働き方'}」の専門家として、それぞれのニュースがあなたの専門分野とどう関連するか、どのような独自の視点を提供できるかを分析してください：

1. **最新ニュースとテクノロジー**
   - AI・機械学習の最新動向
   - テクノロジー業界の重要な発表
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}の視点での解釈を追加

2. **有名人の事件と世間の反応**
   - セレブリティの最新ニュース
   - 炎上事件や話題の発言
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}に関連付けた独自コメント

3. **政治的展開と議論**
   - 政治的な決定や政策変更
   - 選挙や政治スキャンダル
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}への影響や関連性

4. **ビジネスニュースと企業論争**
   - 企業の大型買収や倒産
   - CEO交代や企業スキャンダル
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}の観点からの分析

5. **文化的瞬間と社会運動**
   - バイラルになった文化的現象
   - 社会運動やプロテスト
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}との接点や影響

6. **スポーツイベントと予想外の結果**
   - 大きなスポーツイベントの結果
   - アスリートの話題
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}の視点での考察

7. **インターネットドラマとプラットフォーム論争**
   - SNSでの炎上事件
   - プラットフォームの方針変更
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}に基づく見解

8. **その他の話題性の高いニュース**
   - 自然災害や事故
   - エンターテインメント業界のニュース
   → ${config.config?.expertise || config.expertise || 'AIと働き方'}からの独自解釈

### ソーシャルリスニング研究
以下のプラットフォームでの動向を「${config.config?.expertise || config.expertise || 'AIと働き方'}」の視点から分析：
- Twitterのトレンドトピックとハッシュタグの速度
- TikTokサウンドとチャレンジの出現
- Redditのホットな投稿とコメントの感情
- Googleトレンドの急上昇パターン
- YouTubeトレンド動画分析
- ニュース記事のコメント欄
- ソーシャルメディアのエンゲージメントパターン

### ウイルスパターン認識
「${config.config?.expertise || config.expertise || 'AIと働き方'}」の専門家として、各トピックを以下の6軸で評価（0-1のスコア）：
- 論争レベル（強い意見を生み出す）
- 感情の強さ（怒り、喜び、驚き、憤慨）
- 共感性要因（多くの人に影響を与える）
- 共有可能性（人々が広めたいと思うこと）
- タイミングの敏感さ（関連性のウィンドウが狭い）
- プラットフォームの調整（${config?.platform || 'Twitter'}文化に適合）

以下のJSON形式で回答してください。
**重要: すべての内容を日本語で記述してください。**
**重要: 「${config.config?.expertise || 'AI × 働き方、25年のクリエイティブ経験'}」の専門家として、各記事にあなたの独自の視点や解釈を加えてください。**
**重要: 検索した実際の記事に基づいて、10-15件程度の具体的な記事分析をarticleAnalysis配列に含めてください。**
**重要: 各記事のURLフィールドは必須です。Web検索で見つけた実際のURLを含めてください。**

{
  "articleAnalysis": [
    {
      "title": "実際の記事タイトル（Web検索結果から）",
      "source": "実際のメディア名",
      "url": "https://... （記事の実際のURL - 必須）",
      "publishDate": "YYYY-MM-DD",
      "category": "テクノロジー/有名人/政治/ビジネス/文化/スポーツ/ネットドラマ/その他",
      "importance": 0.0-1.0,
      "summary": "この記事の内容を100文字程度で要約",
      "keyPoints": [
        "重要ポイント1",
        "重要ポイント2",
        "重要ポイント3"
      ],
      "expertPerspective": "${config.config?.expertise || 'AI × 働き方、25年のクリエイティブ経験'}の専門家としての独自の解釈や関連付け",
      "viralPotential": "${config.config?.expertise || 'AI × 働き方、25年のクリエイティブ経験'}の視点から見たバズる可能性とその理由"
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
        "expertAngle": "${config.config?.expertise || 'AI × 働き方、25年のクリエイティブ経験'}の視点からの独自アングル",
        "scores": {
          "controversy": 0.0-1.0,
          "emotion": 0.0-1.0,
          "relatability": 0.0-1.0,
          "shareability": 0.0-1.0,
          "timing": 0.0-1.0,
          "platformFit": 0.0-1.0
        },
        "overallScore": 0.0-1.0,
        "reasoning": "${config.config?.expertise || 'AI × 働き方、25年のクリエイティブ経験'}の専門家として、なぜこれがバズるのかの説明"
      }
      // 必ず5件以上のバズる機会を特定してください
    ]
  },
  "opportunityCount": 数値（5以上）,
  "summary": "「${config.config?.expertise || 'AI × 働き方、25年のクリエイティブ経験'}」の専門家としての全体的な分析サマリー（200文字程度）",
  "keyPoints": [
    "${config?.expertise || 'AI × 働き方'}の視点から見た重要ポイント1",
    "${config?.expertise || 'AI × 働き方'}の視点から見た重要ポイント2",
    "${config?.expertise || 'AI × 働き方'}の視点から見た重要ポイント3",
    "${config?.expertise || 'AI × 働き方'}の視点から見た重要ポイント4",
    "${config?.expertise || 'AI × 働き方'}の視点から見た重要ポイント5"
  ],
  "nextStepMessage": "トレンド分析に基づき、今後48時間以内に[X]件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。"
}
`
}