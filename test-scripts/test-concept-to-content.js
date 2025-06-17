require('dotenv').config()
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 先ほどのテストで生成されたコンセプトを使用
const testConcepts = [
  {
    "conceptId": "topic1_concept1",
    "format": "single",
    "hookType": "意外性（Surprise）",
    "angle": "次に何が起こるかを予測するコンテンツ",
    "structure": {
      "openingHook": "2030年にはAIエージェントがあなたの同僚に？未来の職場の意外な姿を予想する驚きのアプローチ",
      "background": "AIの導入が業務効率を劇的に向上させる中で、創造性の解放と職場の進化の重要性を強調",
      "mainContent": "AIエージェントの具体的な導入事例やデータ、未来の働き方のシナリオを提示",
      "reflection": "AIによりもたらされるチャンスとリスクを再考させ、未来への希望と不安を共有",
      "cta": "AIとともに働く未来について、あなたの意見を聞かせてください"
    },
    "visual": "AIエージェントと人間が協力している未来の職場のイラスト",
    "timing": "月曜日の午前中（週の始まりに未来を考える）",
    "hashtags": ["#AIエージェント", "#未来の職場", "#職場革命"],
    "topicTitle": "AIエージェントが変える未来の働き方：2025年の職場革命",
    "topicUrl": "https://example.com/ai-workplace-revolution-2025"
  },
  {
    "conceptId": "topic1_concept2",
    "format": "thread",
    "hookType": "問い・未完性（Tension）",
    "angle": "専門家による内部視点の分析",
    "structure": {
      "openingHook": "AIが職場を支配する日が近い？その時、私たちはどうなるのか？という問いかけ",
      "background": "AIによる業務自動化の波が押し寄せる現実と、それに対する不安感を喚起",
      "mainContent": "AIの影響を受けた業界の専門家のコメントや分析、AIによる変革の具体的なメリットとデメリット",
      "reflection": "AIがもたらす変化に対する感情的な反応を引き出し、変化に備える力を強調",
      "cta": "AI時代の働き方について、あなたはどう対応しますか？コメントで教えてください"
    },
    "visual": "AIと人間が共存する職場の対比を示すインフォグラフィック",
    "timing": "水曜日の午後（週の中日に深く考える時間として）",
    "hashtags": ["#AI革命", "#職場の未来", "#リスキリング"],
    "topicTitle": "AIエージェントが変える未来の働き方：2025年の職場革命",
    "topicUrl": "https://example.com/ai-workplace-revolution-2025"
  }
]

// テスト用のセッション情報
const session = {
  platform: 'Twitter',
  style: '洞察的'
}

async function generateContentFromConcept(concept) {
  let prompt = `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。

以下のコンセプトを元に、【${session.platform}】で【${session.style}】スタイルの投稿を作成してください。

トピック: ${concept.topicTitle}
形式: ${concept.format}
フックタイプ: ${concept.hookType || '未指定'}
角度: ${concept.angle}

【コンセプトの投稿構造】
${concept.structure ? `
1. オープニングフック: ${concept.structure.openingHook}
2. 背景／問題提起: ${concept.structure.background}
3. 具体的な中身: ${concept.structure.mainContent}
4. 内省・共感・まとめ: ${concept.structure.reflection}
5. CTA: ${concept.structure.cta}
` : `
フック: ${concept.hook || ''}
キーポイント: ${concept.keyPoints ? concept.keyPoints.join(', ') : ''}
`}

推奨ハッシュタグ: ${concept.hashtags ? concept.hashtags.join(', ') : 'なし'}
推奨ビジュアル: ${concept.visual || 'なし'}
推奨投稿タイミング: ${concept.timing || 'なし'}

【重要な指示】
1. 物語性のある魅力的な投稿を作成してください。単なる情報伝達ではなく、読者の感情を動かし、共感を生み、シェアしたくなる物語として構成してください。

2. 上記の投稿構造を厳密に守りながら、自然な流れで展開してください。各要素をスムーズにつなげ、読者を引き込む物語を作ってください。

3. フックタイプ（${concept.hookType || '未指定'}）と角度（${concept.angle}）を最大限活用してください。これらがコンテンツの核心的な差別化要素です。

4. 【最重要】文字数の最適化:
   - 各投稿は必ず135-140文字の範囲で作成してください
   - 短い投稿（100文字未満）は絶対に避けてください
   - 文字数をフルに使って、価値ある情報を最大限詰め込んでください
   - 改行も1文字としてカウントされることを考慮してください

要件:
- ${session.style}スタイルを意識した文体
- 適切な絵文字の使用（ただし文字数を圧迫しない程度に）
- ハッシュタグは3-5個（投稿の最後にまとめて配置）
- 元記事へのリンクを含める（${concept.topicUrl}）
- CTAは自然に組み込む（最後の1-2行で）`

  // フォーマット別の追加指示
  if (concept.format === 'thread') {
    prompt += `

スレッド形式の要件:
- 3-5個のツイートに分割（投稿構造の5要素を自然に分配）
- 【最重要】各ツイートは必ず135-140文字の範囲で最適化
- 「1/5」のような番号を各ツイートの冒頭に付ける（この番号も文字数に含む）
- 各ツイートは独立しても価値があるように構成
- 投稿構造の流れ:
  - 1番目: オープニングフック（最も強力に注意を引く）
  - 2番目: 背景／問題提起（共感を生む）
  - 3番目: 具体的な中身（価値ある情報）
  - 4番目: 内省・共感・まとめ（感情的な結びつき）
  - 5番目: CTA + URL（行動を促す）
- ハッシュタグは最後のツイートにまとめて配置

以下のJSON形式で出力してください:
{
  "tweets": [
    {
      "number": "1/5",
      "content": "ツイート本文（番号含めて135-140文字）",
      "charCount": 文字数（番号と改行を含む実際の文字数）
    }
  ],
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "visualNote": "必要な画像や動画の説明"
}`
  } else {
    prompt += `

以下のJSON形式で出力してください:
{
  "content": "投稿本文（改行、絵文字、ハッシュタグ含む）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "visualNote": "必要な画像や動画の説明"
}`
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは、新たなトレンドを特定し、流行の波がピークに達する前にその波に乗るコンテンツのコンセプトを作成するバズるコンテンツ戦略家です。文字数を最大限活用し、各投稿を135-140文字の範囲で最適化することが重要です。短い投稿は避け、伝えたい内容を最大限に詰め込んでください。JSON形式で正確に出力してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 2000
    })

    const content = response.choices[0].message.content || '{}'
    console.log(`\n📝 GPTからの生の応答 (${concept.format}):\n`)
    console.log(content)
    console.log('\n---\n')

    // JSONをパース
    let parsedContent = {}
    try {
      parsedContent = JSON.parse(content)
    } catch (e) {
      console.error('JSONパースエラー。コードブロックを探します...')
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsedContent = JSON.parse(jsonMatch[0])
        } catch (e2) {
          console.error('抽出したJSONのパースにも失敗:', e2)
          return null
        }
      }
    }

    return {
      conceptId: concept.conceptId,
      format: concept.format,
      generatedContent: parsedContent,
      usage: response.usage
    }

  } catch (error) {
    console.error(`❌ ${concept.format}形式のコンテンツ生成でエラー:`, error)
    return null
  }
}

async function testAllConcepts() {
  console.log('🚀 コンセプト → 投稿文生成のテスト開始\n')
  
  for (let i = 0; i < testConcepts.length; i++) {
    const concept = testConcepts[i]
    console.log(`\n========== テスト ${i + 1}: ${concept.format.toUpperCase()} 形式 ==========`)
    console.log(`コンセプトID: ${concept.conceptId}`)
    console.log(`フックタイプ: ${concept.hookType}`)
    console.log(`角度: ${concept.angle}`)
    console.log('\n⏳ コンテンツ生成中...\n')
    
    const result = await generateContentFromConcept(concept)
    
    if (result) {
      console.log('✅ 生成完了！')
      console.log('\n📋 生成されたコンテンツ:\n')
      
      if (result.format === 'thread' && result.generatedContent.tweets) {
        console.log('🧵 スレッド形式:')
        result.generatedContent.tweets.forEach((tweet, index) => {
          console.log(`\n${tweet.number || `${index + 1}/5`}: ${tweet.content}`)
          console.log(`   文字数: ${tweet.charCount || tweet.content.length}文字`)
        })
        console.log(`\nハッシュタグ: ${result.generatedContent.hashtags?.join(', ') || 'なし'}`)
        console.log(`ビジュアル: ${result.generatedContent.visualNote || 'なし'}`)
      } else {
        console.log('📄 単一投稿形式:')
        console.log(`\n${result.generatedContent.content}`)
        console.log(`\n文字数: ${result.generatedContent.content?.length || 0}文字`)
        console.log(`ハッシュタグ: ${result.generatedContent.hashtags?.join(', ') || 'なし'}`)
        console.log(`ビジュアル: ${result.generatedContent.visualNote || 'なし'}`)
      }
      
      console.log(`\n💡 使用トークン数: ${result.usage?.total_tokens || '不明'}`)
    } else {
      console.log('❌ 生成失敗')
    }
    
    // 次のテストまで少し待機
    if (i < testConcepts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log('\n\n✅ 全テスト完了！')
}

// テスト実行
testAllConcepts()