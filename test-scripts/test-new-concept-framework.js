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

以下のトピックについて、【${session.platform}】で【${session.style}】スタイルでバズる投稿コンセプトを5つ作成してください。

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

【投稿構造の方向性】
下記の構造で、投稿構造の方向性を箇条書きで記載してください（実際の文章ではなく、どのような内容にするかの方針を記載）
1.オープニングフック【方向性のみ記載】
　→ どのような種類の興味を引くアプローチを取るか（問い・驚き・結論の逆提示など）
　→ トピックのどの側面で注意を引くか
2.背景／問題提起【方向性のみ記載】
　→ どんな問題意識や重要性を伝えるか
　→ 読者のどのような体験や感情に訴えるか
3.具体的な中身／ストーリー【方向性のみ記載】
　→ どのような情報やストーリーで説得力を持たせるか
　→ データ・事例・体験談のどれを中心にするか
4.内省・共感・まとめ【方向性のみ記載】
　→ 読者にどのような気づきや感情を与えるか
　→ どんな価値観やメッセージを伝えるか
5.CTA【方向性のみ記載】
　→ 読者にどのような行動を促すか
　→ どんな形でエンゲージメントを求めるか

【ビジュアル案】
上記にふさわしいビジュアル案を提示してください

【投稿タイミング】
上記にふさわしい投稿タイミングを提示してください

【ハッシュタグ案】
上記にふさわしいハッシュタグを3つ提示してください

【重要な注意事項】
これはコンセプト（骨組み・設計図）の生成です。実際の投稿文を書くのではなく、どのような内容にするかの「方向性」「方針」「アプローチ」を示してください。

structure内の各要素には、絶対に具体的な文章を書かないでください。以下のように記載してください：
- ❌ 具体的な文章: 「AIエージェントがあなたの上司になる日が来る？」
- ✅ 方向性のみ: 「AIの急速な進歩による職場の変化を疑問形で投げかけるアプローチ」

各項目は「どのような内容を含めるか」「どんなアプローチを取るか」「何を狙うか」という戦略的な方向性のみを箇条書きで記載してください。

必ず以下のJSON形式で5つのコンセプトを出力してください：
[
  {
    "conceptId": "topic1_concept1",
    "format": "single",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "どのような興味を引くアプローチを取るか（方向性のみ・箇条書き）",
      "background": "どんな問題意識や重要性を伝えるか（方向性のみ・箇条書き）",
      "mainContent": "どのような情報やストーリーで説得力を持たせるか（方向性のみ・箇条書き）",
      "reflection": "読者にどのような気づきや感情を与えるか（方向性のみ・箇条書き）",
      "cta": "読者にどのような行動を促すか（方向性のみ・箇条書き）"
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
      "openingHook": "どのような興味を引くアプローチを取るか（方向性のみ・箇条書き）",
      "background": "どんな問題意識や重要性を伝えるか（方向性のみ・箇条書き）",
      "mainContent": "どのような情報やストーリーで説得力を持たせるか（方向性のみ・箇条書き）",
      "reflection": "読者にどのような気づきや感情を与えるか（方向性のみ・箇条書き）",
      "cta": "読者にどのような行動を促すか（方向性のみ・箇条書き）"
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
      "openingHook": "どのような興味を引くアプローチを取るか（方向性のみ・箇条書き）",
      "background": "どんな問題意識や重要性を伝えるか（方向性のみ・箇条書き）",
      "mainContent": "どのような情報やストーリーで説得力を持たせるか（方向性のみ・箇条書き）",
      "reflection": "読者にどのような気づきや感情を与えるか（方向性のみ・箇条書き）",
      "cta": "読者にどのような行動を促すか（方向性のみ・箇条書き）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic1_concept4",
    "format": "single",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "どのような興味を引くアプローチを取るか（方向性のみ・箇条書き）",
      "background": "どんな問題意識や重要性を伝えるか（方向性のみ・箇条書き）",
      "mainContent": "どのような情報やストーリーで説得力を持たせるか（方向性のみ・箇条書き）",
      "reflection": "読者にどのような気づきや感情を与えるか（方向性のみ・箇条書き）",
      "cta": "読者にどのような行動を促すか（方向性のみ・箇条書き）"
    },
    "visual": "ビジュアル案",
    "timing": "投稿タイミング",
    "hashtags": ["関連ハッシュタグ"]
  },
  {
    "conceptId": "topic1_concept5",
    "format": "thread",
    "hookType": "使用したフックの種類",
    "angle": "選択した角度",
    "structure": {
      "openingHook": "どのような興味を引くアプローチを取るか（方向性のみ・箇条書き）",
      "background": "どんな問題意識や重要性を伝えるか（方向性のみ・箇条書き）",
      "mainContent": "どのような情報やストーリーで説得力を持たせるか（方向性のみ・箇条書き）",
      "reflection": "読者にどのような気づきや感情を与えるか（方向性のみ・箇条書き）",
      "cta": "読者にどのような行動を促すか（方向性のみ・箇条書き）"
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