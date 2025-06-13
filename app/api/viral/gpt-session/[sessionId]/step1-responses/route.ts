import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { parseGptResponse, extractTextFromResponse, extractJsonFromText } from '@/lib/gpt-response-parser'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const startTime = Date.now() // スコープ外に移動
  
  // Vercelタイムアウト対策: レスポンスヘッダー設定
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  }
  
  try {
    const { sessionId } = await params

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

    const config = session.metadata as any

    console.log('Executing GPT Step 1 with two-phase approach...')

    // モデルがGPT-4oかチェック（web_searchはGPT-4oのみサポート）
    const selectedModel = config.config.model || 'gpt-4o'
    const supportsWebSearch = selectedModel === 'gpt-4o'
    
    if (!supportsWebSearch) {
      return NextResponse.json(
        { error: 'Web検索はGPT-4oモデルのみサポートされています。GPT-4oを選択してください。' },
        { status: 400, headers }
      )
    }

    // Phase 1: 記事収集（Responses API + Web検索）
    console.log('Phase 1: Collecting articles with web search...')
    const phase1Start = Date.now()
    
    // タイムアウト対策: より短い収集プロンプト
    const collectionResponse = await openai.responses.create({
      model: selectedModel,
      input: buildCollectionPrompt(config.config),
      tools: [
        {
          type: 'web_search' as any
        }
      ],
      instructions: `web_searchツールを使用して最新記事を5-7個検索し、URLとタイトルのリストをJSON形式で返してください。`
    } as any)

    const phase1Duration = Date.now() - phase1Start
    
    // Phase 1の結果から記事リストを抽出
    let articles = []
    try {
      const collectionText = extractTextFromResponse(collectionResponse)
      console.log('Collection response type:', typeof collectionResponse)
      console.log('Collection text length:', collectionText.length)
      console.log('Collection text preview:', collectionText.substring(0, 200))
      
      // extractJsonFromTextを使用してより確実にJSONを抽出
      const parsed = extractJsonFromText(collectionText)
      if (parsed && parsed.articles) {
        articles = parsed.articles
      } else {
        // フォールバック: 直接JSONマッチを試みる
        const jsonMatch = collectionText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsedJson = JSON.parse(jsonMatch[0])
          articles = parsedJson.articles || []
        }
      }
      
      console.log(`Extracted ${articles.length} articles`)
    } catch (e) {
      console.error('Failed to parse article collection:', e)
      console.error('Collection response:', JSON.stringify(collectionResponse).substring(0, 500))
      throw new Error('記事収集に失敗しました: ' + (e instanceof Error ? e.message : String(e)))
    }
    
    console.log(`Phase 1 completed: ${articles.length} articles collected in ${phase1Duration}ms`)
    
    if (articles.length === 0) {
      throw new Error('記事が見つかりませんでした')
    }
    
    // Phase 2: 詳細分析（Chat Completions API）
    console.log('Phase 2: Analyzing articles with Chat API...')
    const phase2Start = Date.now()
    
    const analysisCompletion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。
          
専門分野: ${config.config?.expertise || 'AI × 働き方'}
プラットフォーム: ${config.config?.platform || 'Twitter'}
スタイル: ${config.config?.style || '洞察的'}`
        },
        {
          role: 'user',
          content: buildAnalysisPrompt(config.config, articles) + '\n\n必ずJSON形式で回答してください。'
        }
      ],
      temperature: 0.7,
      max_tokens: 3000, // トークン数を削減
      response_format: { type: 'json_object' }
    })
    
    const phase2Duration = Date.now() - phase2Start
    const totalDuration = Date.now() - startTime
    
    const analysisResult = JSON.parse(analysisCompletion.choices[0].message.content || '{}')
    console.log('Phase 2 completed - opportunities:', analysisResult.opportunityCount)

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
        tokens: (session.tokens || 0) + (analysisCompletion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + totalDuration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          usedTwoPhaseApproach: true,
          phase1Duration,
          phase2Duration
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
        duration: totalDuration,
        phase1Duration,
        phase2Duration,
        articlesCollected: articles.length,
        tokens: analysisCompletion.usage?.total_tokens
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: analysisResult.nextStepMessage || `トレンド分析に基づき、今後48時間以内に${analysisResult.opportunityCount}件のバズるチャンスが出現すると特定しました。コンテンツのコンセプトについては「続行」と入力してください。`
      }
    }, { headers })

  } catch (error) {
    console.error('GPT Step 1 error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      response: (error as any)?.response?.data || (error as any)?.response
    })
    
    const totalDuration = Date.now() - startTime
    
    return NextResponse.json(
      { 
        error: 'Step 1 分析でエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        timeout: totalDuration > 55000 ? 'タイムアウトの可能性があります' : undefined
      },
      { status: 500, headers }
    )
  }
}

function buildCollectionPrompt(config: any) {
  const today = new Date().toLocaleDateString('ja-JP')
  
  return `
現在の日付: ${today}
専門分野: ${config?.expertise || 'AI × 働き方'}

web_searchツールを使用して、以下のカテゴリから48時間以内の最新記事を検索してください：

1. AI・テクノロジーの最新動向
2. ビジネス・働き方の変革
3. 注目の企業ニュース
4. 話題の社会現象
5. クリエイティブ・デザイン業界
6. スタートアップ・イノベーション
7. 政策・規制の動き
8. 文化・エンターテイメント

各カテゴリから1-2件、合計10-15件の記事を収集し、以下のJSON形式で返してください：

{
  "articles": [
    {
      "title": "記事の正確なタイトル",
      "url": "https://実際のURL",
      "publishDate": "YYYY-MM-DD",
      "source": "メディア名",
      "category": "カテゴリ名"
    }
  ]
}

重要：実在する記事のURLのみを含めてください。`
}

function buildAnalysisPrompt(config: any, articles: any[]) {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  
  return `
## フェーズ1: 収集した記事の詳細分析

現在時刻: ${today.toLocaleString('ja-JP')}
今日の日付: ${formattedDate}

以下の${articles.length}件の記事を「${config?.expertise || 'AI × 働き方'}」の専門家として分析し、48時間以内にバズるチャンスを特定してください。

収集した記事：
${articles.map((article, i) => `
${i + 1}. ${article.title}
   URL: ${article.url}
   日付: ${article.publishDate}
   ソース: ${article.source}
   カテゴリ: ${article.category}
`).join('')}

${buildPrompt(config).split('以下のJSON形式で回答してください。')[1] || ''}
`
}

function buildPromptConcise(config: any) {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  
  return `
あなたは、バズるコンテンツ戦略家です。
専門分野: ${config?.expertise || 'AI × 働き方'}

web_searchツールを使用して、48時間以内にバズる可能性が高い最新ニュースを5件検索してください。

以下のJSON形式で回答（簡潔に）：
{
  "articleAnalysis": [
    {
      "title": "記事タイトル",
      "url": "https://実際のURL（必須）",
      "publishDate": "YYYY-MM-DD",
      "source": "メディア名",
      "summary": "要約（50文字以内）",
      "keyPoints": ["ポイント1（20文字以内）", "ポイント2", "ポイント3"],
      "expertPerspective": "${config?.expertise || 'AI × 働き方'}視点での解釈",
      "viralPotential": "バズる理由（簡潔に）"
    }
  ],
  "opportunityCount": 5,
  "summary": "全体まとめ（100文字以内）",
  "keyPoints": ["重要点1", "重要点2", "重要点3", "重要点4", "重要点5"]
}`
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
    "topCategories": ["カテゴリ1のトレンド", "カテゴリ2のトレンド", "カテゴリ3のトレンド"]
  },
  "socialListening": {
    "topPlatforms": ["プラットフォーム1のトレンド", "プラットフォーム2のトレンド"]
  },
  "viralPatterns": {
    "topOpportunities": [
      {
        "topic": "具体的なトピック名（日本語）",
        "expertAngle": "${config.config?.expertise || 'AI × 働き方、25年のクリエイティブ経験'}の視点からの独自アングル",
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