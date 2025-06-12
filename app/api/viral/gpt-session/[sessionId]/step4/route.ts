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

    if (!currentResponse.step3) {
      return NextResponse.json(
        { error: 'Step 3を先に完了してください' },
        { status: 400 }
      )
    }

    // Step 4: 完全な投稿可能コンテンツ生成のプロンプト
    const prompt = buildStep4Prompt(currentMetadata.config, currentResponse.step3)

    console.log('Executing GPT Step 4 content generation...')
    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたは、${currentMetadata.config.expertise}の専門家で、プロのコンテンツライターです。
Step 3のコンセプトを、すぐに投稿できる完全なコンテンツに仕上げてください。
文字数制限、プラットフォームの特性、エンゲージメントを最大化する要素を考慮してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const duration = Date.now() - startTime
    const response = JSON.parse(completion.choices[0].message.content || '{}')

    // Step 4の結果を保存
    await prisma.gptAnalysis.update({
      where: { id: sessionId },
      data: {
        response: {
          ...currentResponse,
          step4: response
        },
        tokens: (session.tokens || 0) + (completion.usage?.total_tokens || 0),
        duration: (session.duration || 0) + duration,
        metadata: {
          ...currentMetadata,
          currentStep: 4,
          step4CompletedAt: new Date().toISOString()
        }
      }
    })

    // 完全なコンテンツで下書きを更新
    const drafts = await prisma.contentDraft.findMany({
      where: { analysisId: sessionId }
    })

    await Promise.all(
      response.fullContents.map(async (content: any, index: number) => {
        const draft = drafts.find(d => {
          const meta = d.metadata as any
          return meta.conceptNumber === content.conceptNumber
        })

        if (draft) {
          await prisma.contentDraft.update({
            where: { id: draft.id },
            data: {
              content: content.fullContent,
              editedContent: content.fullContent, // 初期値として同じ内容を設定
              metadata: {
                ...(draft.metadata as any),
                fullContentGenerated: true,
                visualDescription: content.visualDescription,
                postingNotes: content.postingNotes,
                platform: content.platform,
                format: content.format
              }
            }
          })
        }
      })
    )

    return NextResponse.json({
      success: true,
      sessionId,
      step: 4,
      fullContents: response.fullContents,
      metrics: {
        duration,
        tokens: completion.usage?.total_tokens
      },
      nextStep: {
        step: 5,
        url: `/api/viral/gpt-session/${sessionId}/step5`,
        description: '実行戦略',
        message: response.nextStepMessage || '投稿できる完全なバズるコンテンツができました。実行戦略については「続行」と入力してください。'
      }
    })

  } catch (error) {
    console.error('GPT Step 4 error:', error)
    
    return NextResponse.json(
      { error: 'Step 4 コンテンツ生成でエラーが発生しました' },
      { status: 500 }
    )
  }
}

function buildStep4Prompt(config: any, step3Data: any) {
  const concepts = step3Data.concepts

  return `
現在時刻: ${new Date().toLocaleString('ja-JP')}
専門分野: ${config.expertise}
プラットフォーム: ${config.platform}
スタイル: ${config.style}

## Step 3のコンセプト
${concepts.map((c: any) => 
  `コンセプト${c.conceptNumber}: ${c.title}
  - トピック: ${c.topic}
  - フック: ${c.hook}
  - 角度: ${c.angle}`
).join('\n\n')}

## タスク: Step 4 - 完全な投稿可能コンテンツ生成

3つの概念ごとに以下を提供してください：

### 完全なコンテンツ配信
- プラットフォームに表示されるとおりに、コピー＆ペースト可能な完全なコンテンツ
- すべてのテキスト、書式、改行、絵文字、ハッシュタグを含める
- 完成させてすぐに投稿できるように準備する
- 視覚的説明: 必要な画像/ビデオの詳細な説明
- 投稿に関する注意事項: 具体的なタイミングと最適化のヒント

### ${config.platform}の制約
${config.platform === 'Twitter' ? `
- 単発投稿: 140文字以内（日本語）
- スレッド: 最初の投稿で注目を集め、2-5投稿で展開
- 改行は2回まで効果的
- ハッシュタグは2-3個が最適
` : ''}

以下のJSON形式で回答してください：

{
  "fullContents": [
    {
      "conceptNumber": 1,
      "topic": "対象トピック",
      "platform": "${config.platform}",
      "format": "single/thread",
      "fullContent": "完全な投稿内容（改行、絵文字、ハッシュタグ含む）",
      "characterCount": 文字数,
      "visualDescription": "必要な画像/ビデオの詳細な説明",
      "postingNotes": "具体的なタイミングと最適化のヒント",
      "alternativeVersions": [
        "微調整版1（オプション）",
        "微調整版2（オプション）"
      ]
    }
  ],
  "optimizationTips": {
    "bestTiming": "最適な投稿時間帯",
    "engagementTactics": ["エンゲージメントを高める戦術"],
    "avoidPitfalls": ["避けるべき落とし穴"]
  },
  "nextStepMessage": "投稿できる完全なバズるコンテンツができました。実行戦略については「続行」と入力してください。"
}

重要:
- ${config.expertise}の視点を維持
- ${config.style}のトーンを保つ
- 文字数制限を厳守
- エンゲージメントを最大化する要素を含める
- すぐにコピー＆ペーストできる状態にする
`
}