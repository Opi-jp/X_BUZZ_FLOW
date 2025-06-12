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
      model: currentMetadata.config.model || 'gpt-4-turbo-preview',
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
      response: {
        fullContents: response.fullContents,
        optimizationTips: response.optimizationTips
      },
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
あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

## フェーズ3B: コンテンツ作成の完了

現在時刻: ${new Date().toLocaleString('ja-JP')}

### あなたの設定情報（フェーズ1-3から引き継ぎ）：
1. あなたの専門分野または業界: ${config.expertise}
2. 重点を置くプラットフォーム: ${config.platform}
3. コンテンツのスタイル: ${config.style}

### フェーズ3で作成したコンセプト
${concepts.map((c: any, idx: number) => {
  const articles = c.sourceArticles || []
  return `
コンセプト${idx + 1}: ${c.title}
- トピック: ${c.topic}
- フック: ${c.hook}
- 角度: ${c.angle}
- ${config.expertise}の視点: ${c.explanation || ''}
- 参照記事:
${articles.map((article: any) => `  • ${article.title} (${article.url || 'URLなし'})`).join('\n')}
`
}).join('\n')}

各コンセプトの完全な投稿可能なコンテンツを「${config.expertise}」の専門家として作成します。

### 完全なコンテンツ配信
3つの概念ごとに以下を提供します：

コンセプト1: [トレンドトピック] - 完全なコンテンツ
- ${config.platform}に表示されるとおりに、コピー＆ペースト可能な完全なコンテンツを作成
- ${config.expertise}の専門性を活かしたテキスト
- ${config.style}に合った書式、改行、絵文字、ハッシュタグを含める
- 完成させてすぐに投稿できるように準備する

視覚的説明: 必要な画像/ビデオの詳細な説明
投稿に関する注意事項: 具体的なタイミングと最適化のヒント

### ${config.platform}の制約と${config.expertise}の活かし方
${config.platform === 'Twitter' ? `
- 単発投稿: 140文字以内（日本語）で${config.expertise}の知見を凝縮
- スレッド: ${config.expertise}の専門性を段階的に展開（2-5投稿）
- 最初の投稿で${config.expertise}ならではのフックを提示
- 改行は2回まで効果的に使用
- ハッシュタグは${config.expertise}関連とトレンドを組み合わせて2-3個
` : `
- ${config.platform}のフォーマットに合わせて${config.expertise}の専門性を表現
- ${config.style}を維持しながら情報を構成
`}

以下のJSON形式で回答してください：

**重要: すべての内容を日本語で記述してください。英語は使用しないでください。**

{
  "fullContents": [
    {
      "conceptNumber": 1,
      "topic": "対象トピック",
      "platform": "${config.platform}",
      "format": "single/thread",
      "fullContent": "${config.expertise}の専門家として作成した完全な投稿内容（改行、絵文字、ハッシュタグ含む）",
      "characterCount": 文字数,
      "visualDescription": "${config.platform}に適した画像/ビデオの詳細な説明",
      "postingNotes": "${config.expertise}の視点を最大限活かすための投稿タイミングとヒント",
      "alternativeVersions": [
        "${config.style}の別バージョン1",
        "${config.style}の別バージョン2"
      ],
      "sourceArticles": [
        {
          "title": "引用する記事タイトル",
          "url": "記事URL（引用ツイートで使用）",
          "quoteTweet": "${config.expertise}の専門家として引用ツイートする場合の文面"
        }
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