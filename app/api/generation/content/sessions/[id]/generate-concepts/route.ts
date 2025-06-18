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
    
    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 400 }
      )
    }
    
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

    // 最も有望な2つのトピックのみを処理
    const topicsToProcess = topics.slice(0, 2)
    console.log(`Processing ${topicsToProcess.length} most promising topics`)
    
    // 各トピックに対して3つのコンセプトを生成
    const conceptPromises = topicsToProcess.map(async (topic: any, topicIndex: number) => {
      const prompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下のトピックについて、【${session.platform}】で【${session.style}】スタイルでバズる投稿コンセプトを3つ作成してください。

トピック: ${topic.TOPIC}
分析: ${topic.perplexityAnalysis}
URL: ${topic.url}

【フック】

●以下の5種類のうちいずれか（または組み合わせ）を使って、心をつかむ「オープニングフック」を3つ考えてください：
    1.    意外性（Surprise）：常識の逆をつく／想定外の展開
    2.    緊急性（Urgency）：今すぐ知るべき／時間や期限を意識させる
    3.    自己投影（Identity）：読者が「自分のことだ」と感じる視点
    4.    数字・ロジック（Clarity）：データや具体性による説得力
    5.    問い・未完性（Tension）：答えが知りたくなる問いかけ／途中で止める余白

⸻

【角度】

●上記のフックを活かし、以下の観点をもとに"独自の切り口"を3つ構想してください：
    •    世の流れに対して"逆張りする"視点
    •    当事者や専門家の"リアルな声"に基づく分析
    •    個人的な体験や人間関係を起点とした"ストーリー型"
    •    背景や構造を解きほぐす"わかりやすい解説型"
    •    今後の動きや波及効果を読む"予測・考察型"
    •    見えづらい部分に焦点を当てる"舞台裏や裏話的視点"
    •    過去の出来事との"比較や参照"による構造的視点
    •    誤解や常識を覆す"神話破壊型"
    •    具体例を深堀りする"ケーススタディ型"
    •    統計やグラフで語る"データ駆動型"
    •    社会的課題を浮き彫りにする"問題提起型"
    •    実用的なヒントを提供する"ライフハック型"

⸻

【投稿構造】

●下記の流れに沿って、1投稿を構成してください：
    1.    オープニングフック
　👉 興味を引く最初の一文（驚き・問い・逆説 など）
　例：「たった1つの工夫で、仕事が3倍速くなるとしたら？」
    2.    背景／問題提起（Why）
　👉 なぜその話が今重要なのか／どんな課題を扱うのか
　例：「多くの人が、"情報に振り回される働き方"をしている」
    3.    具体的な中身（What/How）
　👉 ノウハウ・体験談・数字・ストーリーなど。箇条書きでも可
　例：「ぼくが試したのは、"朝10分だけの○○習慣"」
    4.    まとめ・内省・共感（So What）
　👉 読者に問いかける／共感を引き出す／価値づけする
　例：「大切なのは、ツールじゃなく"使い方"だった」
    5.    CTA（行動のきっかけ）
　👉 コメント・RT・保存・プロフィール誘導など
　例：「あなたの習慣術、よかったら教えてください」

⸻

【ビジュアル案】

●投稿の印象を高める画像や動画の方向性を提案してください。例：
    •    グラフや数字を強調したインフォグラフィック
    •    before→afterで変化が伝わる2枚比較画像
    •    感情に訴える写真（顔・手・空・紙などの抽象）
    •    手書き風の図解
    •    モノローグ系の静かな動画

⸻

【投稿タイミング】

●ターゲット層に合わせて、最適な投稿時間帯と曜日を提示してください。例：
    •    平日夜（21時〜23時）
    •    日曜夕方（「明日から」モードを活用）
    •    月曜朝（モチベーション系に強い）

【角度の組み合わせルール】
- 各コンセプトは異なる角度を使用すること
- 2-3個の角度を組み合わせる場合は、相乗効果を狙うこと
- 同じ角度の組み合わせを繰り返さないこと

また、構想したコンセプトが一目で分かるよう、各コンセプトに20文字以内のタイトルを付けてください。

構想したコンセプトにふさわしいのは単独投稿かツリー投稿かも指示してください。
- single: 単独投稿（140文字以内で完結）
- thread: ツリー投稿（複数の投稿で詳細に展開）

必ず以下のJSON形式で3つのコンセプトを出力してください：
[
  {
    "conceptId": "topic${topicIndex + 1}_concept1",
    "conceptTitle": "コンセプトのタイトル（20文字以内）",
    "format": "single/threadのいずれか",
    "hookType": "使用したフックの種類",
    "hookCombination": ["組み合わせた場合のフックタイプ"],
    "angle": "メイン角度",
    "angleCombination": ["使用した角度の組み合わせ"],
    "angleRationale": "なぜこの角度/組み合わせが効果的か、なぜこの形式を選んだか",
    "viralScore": 85,
    "viralFactors": ["バズる要因1", "バズる要因2"],
    "structure": {
      "openingHook": "どのような驚きや問いかけで始めるか",
      "background": "どんな現状認識や問題意識を提示するか",
      "mainContent": "どんな事実・体験・分析を展開するか",
      "reflection": "どのような共感ポイントや価値づけをするか",
      "cta": "どんな行動を促すか（コメント・RT・保存など）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic${topicIndex + 1}_concept2",
    "conceptTitle": "コンセプトのタイトル（20文字以内）",
    "format": "single/threadのいずれか",
    "hookType": "使用したフックの種類",
    "hookCombination": ["組み合わせた場合のフックタイプ"],
    "angle": "メイン角度",
    "angleCombination": ["使用した角度の組み合わせ"],
    "angleRationale": "なぜこの角度/組み合わせが効果的か、なぜこの形式を選んだか",
    "viralScore": 82,
    "viralFactors": ["バズる要因1", "バズる要因2"],
    "structure": {
      "openingHook": "どのような驚きや問いかけで始めるか",
      "background": "どんな現状認識や問題意識を提示するか",
      "mainContent": "どんな事実・体験・分析を展開するか",
      "reflection": "どのような共感ポイントや価値づけをするか",
      "cta": "どんな行動を促すか（コメント・RT・保存など）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic${topicIndex + 1}_concept3",
    "conceptTitle": "コンセプトのタイトル（20文字以内）",
    "format": "single/threadのいずれか",
    "hookType": "使用したフックの種類",
    "hookCombination": ["組み合わせた場合のフックタイプ"],
    "angle": "メイン角度",
    "angleCombination": ["使用した角度の組み合わせ"],
    "angleRationale": "なぜこの角度/組み合わせが効果的か、なぜこの形式を選んだか",
    "viralScore": 88,
    "viralFactors": ["バズる要因1", "バズる要因2"],
    "structure": {
      "openingHook": "どのような驚きや問いかけで始めるか",
      "background": "どんな現状認識や問題意識を提示するか",
      "mainContent": "どんな事実・体験・分析を展開するか",
      "reflection": "どのような共感ポイントや価値づけをするか",
      "cta": "どんな行動を促すか（コメント・RT・保存など）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  }
]`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'JSON形式で正確に出力してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3500
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