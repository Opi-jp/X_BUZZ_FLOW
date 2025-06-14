import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { draftId, focusArea = 'hook' } = await request.json()
    
    // 元の下書きを取得
    const draft = await prisma.cotDraft.findUnique({
      where: { id: draftId }
    })
    
    if (!draft) {
      return NextResponse.json(
        { error: '下書きが見つかりません' },
        { status: 404 }
      )
    }
    
    // バリエーション生成プロンプト
    const prompt = buildABTestPrompt(draft, focusArea)
    
    // GPTでバリエーション生成
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはA/Bテストのエキスパートです。異なるアプローチで同じメッセージを伝える複数のバリエーションを生成します。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
    
    const variations = JSON.parse(response.choices[0].message.content || '{}')
    
    // バリエーションをDBに保存
    const savedVariations = await Promise.all(
      variations.variants.map(async (variant: any, index: number) => {
        return await prisma.cotDraft.create({
          data: {
            sessionId: draft.sessionId,
            conceptNumber: draft.conceptNumber + index + 1,
            title: `${draft.title} - バリエーション${String.fromCharCode(65 + index)}`,
            hook: variant.content.substring(0, 50),
            angle: draft.angle,
            format: draft.format,
            content: variant.content,
            editedContent: variant.content,
            timing: draft.timing,
            hashtags: draft.hashtags,
            newsSource: draft.newsSource,
            sourceUrl: draft.sourceUrl,
            kpis: {
              ...(draft.kpis as any || {}),
              abTestInfo: {
                isABTestVariant: true,
                originalDraftId: draftId,
                variantType: focusArea,
                variantApproach: variant.approach,
                expectedDifference: variant.expectedDifference
              }
            } as any,
            status: 'DRAFT'
          }
        })
      })
    )
    
    return NextResponse.json({
      success: true,
      originalId: draftId,
      variants: savedVariations.map(v => ({
        id: v.id,
        content: v.content,
        approach: (v.kpis as any)?.abTestInfo?.variantApproach,
        expectedDifference: (v.kpis as any)?.abTestInfo?.expectedDifference
      })),
      focusArea,
      totalVariants: savedVariations.length
    })
    
  } catch (error) {
    console.error('A/Bテスト生成エラー:', error)
    return NextResponse.json(
      { error: 'バリエーション生成に失敗しました' },
      { status: 500 }
    )
  }
}

function buildABTestPrompt(draft: any, focusArea: string): string {
  const focusPrompts: Record<string, string> = {
    hook: `
オープニングフックのA/Bテストバリエーションを3つ生成してください。

元の投稿:
${draft.content}

異なるアプローチ:
1. 質問形式 - 読者に問いかける
2. 統計/数字 - 具体的なデータで始める
3. 感情訴求 - 感情に訴える表現
`,
    cta: `
CTAのA/Bテストバリエーションを3つ生成してください。

元の投稿:
${draft.content}

異なるアプローチ:
1. 行動促進型 - 具体的な行動を促す
2. 質問型 - エンゲージメントを促す質問
3. 共感型 - 共感を求める表現
`,
    emotion: `
感情トーンのA/Bテストバリエーションを3つ生成してください。

元の投稿:
${draft.content}

異なるトーン:
1. 楽観的/ポジティブ
2. 緊急性/危機感
3. 好奇心/ミステリー
`
  }
  
  return `
${focusPrompts[focusArea] || focusPrompts.hook}

各バリエーションについて、以下のJSON形式で返してください:
{
  "variants": [
    {
      "content": "完全な投稿テキスト（140文字以内）",
      "approach": "アプローチの説明",
      "reasoning": "なぜこのアプローチが効果的か",
      "expectedDifference": "期待される違い（エンゲージメント率の変化など）"
    }
  ]
}

重要:
- 元のメッセージの本質は保ちつつ、表現方法を変える
- 各バリエーションは明確に異なるアプローチを取る
- 日本語140文字制限を厳守
- ハッシュタグは元の投稿と同じものを使用
`
}