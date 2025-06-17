require('dotenv').config()
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Perplexityからの実際の出力例（AIと働き方のトピック）
const mockTopic = {
  TOPIC: "AIエージェントが変える未来の働き方：2025年の職場革命",
  perplexityAnalysis: "AIエージェントの導入により、企業の業務効率が劇的に向上している。特に事務作業の自動化により、人間はより創造的な仕事に集中できるようになっている。一方で、AIに仕事を奪われるという不安も広がっており、リスキリングの必要性が高まっている。",
  url: "https://example.com/ai-workplace-revolution-2025"
}

// テスト用のセッション情報
const session = {
  platform: 'Twitter',
  style: '洞察的'
}

async function testConceptGeneration() {
  const prompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下のトピックについて、【${session.platform}】で【${session.style}】スタイルでバズる投稿コンセプトを3つ作成してください。

トピック: ${mockTopic.TOPIC}
分析: ${mockTopic.perplexityAnalysis}
URL: ${mockTopic.url}

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
　※例：「たった1つの工夫で、仕事が3倍速くなるとしたら？」
2.背景／問題提起（Why）
　👉 なぜそれが重要なのか／何が問題なのか
　※例：「多くの人が"情報に振り回される働き方"をしてる」
3.具体的な中身／ストーリー（What/How）
　👉 ノウハウ・体験談・ストーリー・箇条書きでもOK
　※例：「ぼくが取り入れたのは、"朝10分の〇〇習慣"」
4.内省・共感・まとめ（So What）
　👉 読者の気持ちに寄り添い、意味づけ／価値化する
　※例：「大切なのは、ツールじゃなく"使い方"だった」
5.CTA（Call to Action）
　👉 リプ・RT・保存・プロフィール誘導など
　※例：「あなたの習慣術、よかったら教えて」

【ビジュアル案】
上記にふさわしいビジュアル案を提示してください

【投稿タイミング】
上記にふさわしい投稿タイミングを提示してください

【ハッシュタグ案】
上記にふさわしいハッシュタグを3つ提示してください

【重要な注意事項】
これはコンセプト（骨組み・設計図）の生成です。実際の投稿文を書くのではなく、どのような内容にするかの「方向性」「方針」「アプローチ」を示してください。

structure内の各要素には、具体的な文章ではなく、「どのような内容を含めるか」「どんなアプローチを取るか」「何を狙うか」という方向性を記載してください。

必ず以下のJSON形式で3つのコンセプトを出力してください：
[
  {
    "conceptId": "topic1_concept1",
    "format": "single",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "このトピックでどう興味を引くか（方向性）",
      "background": "どんな問題提起をするか（方向性）",
      "mainContent": "何を伝えるか（方向性）",
      "reflection": "どう共感を生むか（方向性）",
      "cta": "どんな行動を促すか（方向性）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic1_concept2",
    "format": "thread",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "このトピックでどう興味を引くか（方向性）",
      "background": "どんな問題提起をするか（方向性）",
      "mainContent": "何を伝えるか（方向性）",
      "reflection": "どう共感を生むか（方向性）",
      "cta": "どんな行動を促すか（方向性）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic1_concept3",
    "format": "carousel",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "このトピックでどう興味を引くか（方向性）",
      "background": "どんな問題提起をするか（方向性）",
      "mainContent": "何を伝えるか（方向性）",
      "reflection": "どう共感を生むか（方向性）",
      "cta": "どんな行動を促すか（方向性）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  }
]`

  try {
    console.log('🚀 新しいコンセプトフレームワークのテスト開始\n')
    console.log('📊 入力トピック:')
    console.log(`- タイトル: ${mockTopic.TOPIC}`)
    console.log(`- 分析: ${mockTopic.perplexityAnalysis}`)
    console.log(`- プラットフォーム: ${session.platform}`)
    console.log(`- スタイル: ${session.style}`)
    console.log('\n⏳ GPT-4oにリクエスト送信中...\n')

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
      max_tokens: 3000
    })

    const content = response.choices[0].message.content || '[]'
    console.log('📝 GPTからの生の応答:')
    console.log(content)
    console.log('\n---\n')

    // JSONをパース
    let concepts = []
    try {
      concepts = JSON.parse(content)
    } catch (e) {
      console.error('JSONパースエラー。コードブロックを探します...')
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        concepts = JSON.parse(jsonMatch[0])
      }
    }

    console.log('✅ パースされたコンセプト数:', concepts.length)
    console.log('\n📋 生成されたコンセプト詳細:\n')

    // 各コンセプトを詳細表示
    concepts.forEach((concept, index) => {
      console.log(`\n========== コンセプト ${index + 1} ==========`)
      console.log(`ID: ${concept.conceptId}`)
      console.log(`形式: ${concept.format}`)
      console.log(`フックタイプ: ${concept.hookType}`)
      console.log(`角度: ${concept.angle}`)
      console.log('\n【投稿構造】')
      console.log(`1. オープニングフック:\n   ${concept.structure.openingHook}`)
      console.log(`2. 背景／問題提起:\n   ${concept.structure.background}`)
      console.log(`3. 具体的な中身:\n   ${concept.structure.mainContent}`)
      console.log(`4. 内省・共感・まとめ:\n   ${concept.structure.reflection}`)
      console.log(`5. CTA:\n   ${concept.structure.cta}`)
      console.log(`\nビジュアル案: ${concept.visual}`)
      console.log(`投稿タイミング: ${concept.timing}`)
      console.log(`ハッシュタグ: ${concept.hashtags.join(', ')}`)
    })

    console.log('\n\n✅ テスト完了！')
    console.log('\n💡 使用トークン数:', response.usage?.total_tokens || '不明')

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    if (error.response) {
      console.error('APIレスポンス:', error.response.data)
    }
  }
}

// テスト実行
testConceptGeneration()