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
    const selectedModel = config.config.model || 'gpt-4o'

    console.log('Executing GPT Step 1 with Assistants API and web search...')
    const startTime = Date.now()

    // Step 1: Assistantを作成（web_searchツール付き）
    const assistant = await openai.beta.assistants.create({
      name: 'Viral Content Analyst',
      instructions: `あなたは、${config.config.expertise}の専門家で、SNSトレンドアナリストです。

【重要な指示】
1. 必ずweb_searchツールを使用して、最新のニュースやトレンドを検索してください
2. 推測や過去の知識ではなく、Web検索で見つけた実際の最新情報のみを使用してください
3. 各トピックについて最低3-5件のWeb検索を実行してください
4. 検索結果から信頼できる情報源（大手メディア、公式サイト等）を優先してください
5. すべての出力は日本語で行い、指定されたJSON形式で返してください
6. 架空の製品名やモデル名は絶対に使用しないでください
7. 実際に存在するニュース記事のタイトル、ソース、日付を正確に記載してください
8. 「2025年12月」の最新ニュースを取得してください（今日の日付: ${new Date().toLocaleDateString('ja-JP')}）
9. 必ず過去7日間以内のニュースを優先してください
10. 各検索で「site:」演算子を使って信頼できるソースから検索（例：「site:techcrunch.com AI news」）

バイラルコンテンツの機会を特定し、詳細な分析を行ってください。`,
      tools: [{ type: 'web_search' as any }],
      model: selectedModel,
      response_format: { type: 'json_object' }
    })

    // Step 2: Threadを作成
    const thread = await openai.beta.threads.create()

    // Step 3: createAndPollを使用してRunを開始し完了を待つ
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
      additional_messages: [{
        role: 'user',
        content: buildPrompt(config.config)
      }],
      instructions: `このメッセージに回答する際は、必ずweb_searchツールを使用してください。
推測ではなく、実際のWeb検索結果に基づいて回答してください。`,
      tools: [{ type: 'web_search' as any }]
    })

    console.log('Run completed:', run.id, run.status)

    if (run.status !== 'completed') {
      console.error('Run failed:', run)
      throw new Error(`Run failed with status: ${run.status}`)
    }

    // Step 5: 回答を取得
    const messages = await openai.beta.threads.messages.list(thread.id)
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant')

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error('No assistant response found')
    }

    const rawResponse = assistantMessage.content[0].type === 'text' 
      ? assistantMessage.content[0].text.value 
      : ''

    const duration = Date.now() - startTime
    console.log('GPT Step 1 response length:', rawResponse.length)
    
    // 結果を解析
    let analysisResult
    try {
      analysisResult = JSON.parse(rawResponse)
      console.log('Parsed response - articleAnalysis count:', analysisResult.articleAnalysis?.length || 0)
    } catch (parseError) {
      console.error('Failed to parse assistant response:', parseError)
      console.error('Raw response:', rawResponse.substring(0, 500))
      throw new Error('アシスタント応答の解析に失敗しました')
    }

    // クリーンアップ：Assistantを削除
    await openai.beta.assistants.delete(assistant.id)

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
        tokens: (session.tokens || 0) + (run.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 1,
          step1CompletedAt: new Date().toISOString(),
          usedAssistantsAPI: true,
          threadId: thread.id
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
        tokens: run.usage?.total_tokens
      },
      nextStep: {
        step: 2,
        url: `/api/viral/gpt-session/${sessionId}/step2`,
        description: 'トレンド評価・角度分析',
        message: analysisResult.nextStepMessage || `トレンド分析に基づき、今後48時間以内に${analysisResult.opportunityCount}件のバズるチャンスが出現すると特定しました。`
      }
    })

  } catch (error) {
    console.error('GPT Step 1 Assistant error:', error)
    
    return NextResponse.json(
      { error: 'Step 1 分析でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildPrompt(config: any) {
  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config?.expertise || 'AI × 働き方'}
プラットフォーム: ${config?.platform || 'Twitter'}
スタイル: ${config?.style || '解説 × エンタメ'}

## タスク: 最新ニュースを検索してバイラルコンテンツの機会を分析

【必須要件】
- 以下の各トピックについて、必ずweb_searchツールを使用して最新情報を検索してください
- 「おそらく」「推測では」などの表現は使わず、検索結果に基づいた事実のみを記載してください
- 各検索クエリは具体的に（例：「OpenAI news today」「Anthropic Claude latest」）
- 架空のモデル名（GPT-5、GPT-4o2など）は使用せず、実在するモデル（GPT-4o、Claude 3.5、Gemini 2.5など）のみ記載
- 実際のニュース記事のURL、公開日、著者名を可能な限り含める

検索すべきトピック：
1. AI・機械学習の最新動向（OpenAI、Anthropic、Google、Microsoft等）
   - 検索例：「OpenAI news today」「Anthropic Claude latest update」「Google Gemini December 2025」
   - 重要：GPT-4o（2024年5月リリース）より新しいニュースを探す
2. AIと働き方・雇用への影響に関する議論
   - 検索例：「AI jobs impact December 2025」「AI workplace latest news」
3. テクノロジー業界の重要な発表や動き
   - 検索例：「AI news today」「tech AI announcements December 6 2025」
4. ビジネス界でのAI活用事例
   - 検索例：「AI business news December 2025」「enterprise AI latest」
5. AI規制・倫理に関する最新の議論
   - 検索例：「AI regulation December 2025」「AI policy news today」

**重要な検索指示**：
- 「today」「latest」「December 2025」などの時間指定を必ず含める
- 過去1週間以内のニュースを優先
- 古いニュース（GPT-4oリリース等）は除外

検索した記事を分析し、以下の観点で包括的な分析を行ってください：

### 1. 現在の出来事の分析
### 2. ソーシャルリスニング研究（推測でも可）
### 3. ウイルスパターン認識（6軸での評価）

以下のJSON形式で回答してください。
**重要: すべての内容を日本語で記述してください。**
**重要: web_searchで見つけた実際の記事に基づいて、10-15件程度の具体的な記事分析をarticleAnalysis配列に含めてください。**
**重要: 各記事について、実際の記事タイトル、メディア名、公開日を正確に記載してください。**
**重要: 2025年11月30日以降の記事のみを含めてください（古い記事は除外）。**

{
  "articleAnalysis": [
    {
      "title": "実際の記事タイトル（検索結果から正確に）",
      "source": "実際のメディア名（例: OpenAI Blog, TechCrunch等）",
      "publishDate": "YYYY-MM-DD形式の公開日",
      "url": "記事のURL（可能な場合）",
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
    ]
  },
  "opportunityCount": 数値,
  "summary": "全体的な分析サマリー（200文字程度）",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3", "ポイント4", "ポイント5"],
  "nextStepMessage": "メッセージ"
}
`
}