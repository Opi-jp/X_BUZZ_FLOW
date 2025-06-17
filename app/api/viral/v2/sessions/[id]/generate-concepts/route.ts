import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    
    // セッションを取得
    const session = await prisma.viralSession.findUnique({
      where: { id }
    })
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    if (!session.topics || session.status !== 'TOPICS_COLLECTED') {
      return NextResponse.json(
        { error: 'Topics not collected yet' },
        { status: 400 }
      )
    }

    // ステータスを更新
    await prisma.viralSession.update({
      where: { id },
      data: { status: 'GENERATING_CONCEPTS' }
    })

    const topics = (session.topics as any).parsed || []
    
    if (topics.length === 0) {
      throw new Error('No topics found in session')
    }

    // 各トピックに対して3つのコンセプトを生成
    const conceptPromises = topics.map(async (topic: any, topicIndex: number) => {
      const prompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下のトピックについて、【${session.platform}】で【${session.style}】スタイルでバズる投稿コンセプトを3つ作成してください。

トピック: ${topic.TOPIC}
分析: ${topic.perplexityAnalysis}
URL: ${topic.url}

【フック】
下記の5種類のいずれか、あるいは複数を用いて3つフックを考えてください
1. 意外性（Surprise）
2. 緊急性（Urgency）
3. 自己投影（Identity）
4. 数字・ロジック（Clarity）
5. 問い・未完性（Tension）

【角度】
フックをもとに、以下を参考に独自角度を3つ考えてください
- 反対派は世論に異議を唱える
- 専門家による内部視点の分析
- 個人的なつながりの物語
- 教育の内訳
- 次に何が起こるかを予測するコンテンツ
- 舞台裏の洞察
- 過去のイベントとの比較内容

【投稿構造】
下記の構造で、投稿構造を作成してください
1.オープニングフック
　👉 興味を引く1行（問い・驚き・結論の逆提示）
2.背景／問題提起（Why）
　👉 なぜそれが重要なのか／何が問題なのか
3.具体的な中身／ストーリー（What/How）
　👉 ノウハウ・体験談・ストーリー・箇条書きでもOK
4.内省・共感・まとめ（So What）
　👉 読者の気持ちに寄り添い、意味づけ／価値化する
5.CTA（Call to Action）
　👉 リプ・RT・保存・プロフィール誘導など

【ビジュアル案】
上記にふさわしいビジュアル案を提示してください

【投稿タイミング】
上記にふさわしい投稿タイミングを提示してください

【ハッシュタグ案】
上記にふさわしいハッシュタグを3つ提示してください

必ず以下のJSON形式で3つのコンセプトを出力してください：
[
  {
    "conceptId": "topic${topicIndex + 1}_concept1",
    "format": "single",
    "hookType": "使用したフックの種類（例：意外性、緊急性など）",
    "angle": "選択した角度（例：個人的なつながりの物語）",
    "structure": {
      "openingHook": "興味を引く1行",
      "background": "なぜそれが重要なのか／何が問題なのか",
      "mainContent": "具体的な中身／ストーリー",
      "reflection": "読者の気持ちに寄り添い、意味づけ／価値化",
      "cta": "リプ・RT・保存・プロフィール誘導など"
    },
    "visual": "ビジュアル案の説明",
    "timing": "投稿タイミングの提案",
    "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"]
  },
  {
    "conceptId": "topic${topicIndex + 1}_concept2",
    "format": "thread",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "興味を引く1行",
      "background": "背景／問題提起",
      "mainContent": "具体的な中身（thread形式の場合は各ツイートの概要）",
      "reflection": "内省・共感・まとめ",
      "cta": "CTA"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"]
  },
  {
    "conceptId": "topic${topicIndex + 1}_concept3",
    "format": "carousel",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "興味を引く1行",
      "background": "背景／問題提起",
      "mainContent": "具体的な中身（carousel形式の場合は各スライドの概要）",
      "reflection": "内省・共感・まとめ",
      "cta": "CTA"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"]
  }
]`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。JSON形式で正確に出力してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })

      const content = response.choices[0].message.content || '[]'
      let concepts = []
      
      try {
        concepts = JSON.parse(content)
      } catch (e) {
        console.error('Failed to parse concepts:', e)
        // JSONブロックを探す
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            concepts = JSON.parse(jsonMatch[0])
          } catch (e2) {
            console.error('Failed to parse extracted JSON:', e2)
          }
        }
      }

      // トピック情報を各コンセプトに追加
      return concepts.map((concept: any) => ({
        ...concept,
        topicTitle: topic.TOPIC,
        topicUrl: topic.url,
        topicSummary: topic.summary
      }))
    })

    const allConceptsArrays = await Promise.all(conceptPromises)
    const allConcepts = allConceptsArrays.flat()

    console.log(`Generated ${allConcepts.length} concepts total`)

    // セッションを更新
    const updatedSession = await prisma.viralSession.update({
      where: { id },
      data: {
        concepts: allConcepts,
        status: 'CONCEPTS_GENERATED'
      }
    })

    return NextResponse.json({
      success: true,
      session: updatedSession,
      conceptsCount: allConcepts.length
    })
    
  } catch (error) {
    console.error('Error generating concepts:', error)
    
    // エラー時はステータスを戻す
    try {
      await prisma.viralSession.update({
        where: { id: (await params).id },
        data: { status: 'TOPICS_COLLECTED' }
      })
    } catch (e) {
      // リセットエラーは無視
    }
    
    return NextResponse.json(
      { error: 'Failed to generate concepts' },
      { status: 500 }
    )
  }
}