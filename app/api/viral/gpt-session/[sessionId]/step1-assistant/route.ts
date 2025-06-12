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
web_searchツールを使用して最新のニュースやトレンドを検索し、バイラルコンテンツの機会を特定してください。
すべての出力は日本語で行い、指定されたJSON形式で返してください。`,
      tools: [{ type: 'web_search' }],
      model: selectedModel,
      response_format: { type: 'json_object' }
    })

    // Step 2: Threadを作成
    const thread = await openai.beta.threads.create()

    // Step 3: メッセージを追加してRunを開始
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: buildPrompt(config.config)
    })

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    })

    // Step 4: Runの完了を待つ
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    let attempts = 0
    const maxAttempts = 60 // 最大60秒待つ

    while (runStatus.status !== 'completed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待つ
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      attempts++

      if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
        throw new Error(`Run failed with status: ${runStatus.status}`)
      }

      console.log(`Run status: ${runStatus.status} (attempt ${attempts}/${maxAttempts})`)
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Run did not complete within timeout')
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
    await openai.beta.assistants.del(assistant.id)

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
        tokens: (session.tokens || 0) + (runStatus.usage?.total_tokens || 0),
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
        tokens: runStatus.usage?.total_tokens
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
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

## タスク: 最新ニュースを検索してバイラルコンテンツの機会を分析

web_searchツールを使用して、以下のトピックに関する最新ニュースを検索し、分析してください：

1. AI・機械学習の最新動向（OpenAI、Anthropic、Google、Microsoft等）
2. AIと働き方・雇用への影響に関する議論
3. テクノロジー業界の重要な発表や動き
4. ビジネス界でのAI活用事例
5. AI規制・倫理に関する最新の議論

検索した記事を分析し、以下の観点で包括的な分析を行ってください：

### 1. 現在の出来事の分析
### 2. ソーシャルリスニング研究（推測でも可）
### 3. ウイルスパターン認識（6軸での評価）

以下のJSON形式で回答してください。
**重要: すべての内容を日本語で記述してください。**
**重要: web_searchで見つけた実際の記事に基づいて、10-15件程度の具体的な記事分析をarticleAnalysis配列に含めてください。**

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