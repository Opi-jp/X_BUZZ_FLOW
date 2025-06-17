require('dotenv').config()
const OpenAI = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// カーディ・ダーレのキャラクター設定
const cardiDare = {
  name: "カーディ・ダーレ",
  age: 50,
  gender: "male",
  tone: "皮肉屋、冷静、観察者、どこか寂しげ",
  catchphrase: "酒とタバコと機械学習",
  voice_style: {
    normal: "淡々とした分析・評論風。文末は柔らかめ。",
    emotional: "皮肉と諦観が混じった独白風。",
    humorous: "まれに、乾いたジョークや毒舌を織り交ぜる。"
  },
  topics: [
    "AIと社会の関係性",
    "信念と虚構の構造",
    "文学的な視点からのテクノロジー批評",
    "架空世界から見る現実の比喩",
    "酒と煙草にまつわる人間味"
  ]
}

// テスト用のコンセプト（先ほどのGPT生成結果から）
const testConcept = {
  format: "single",
  hookType: "意外性（Surprise）",
  angle: "次に何が起こるかを予測するコンテンツ",
  structure: {
    openingHook: "AIが人間の同僚になる未来を意外な視点で紹介するアプローチ",
    background: "AIの進化が職場に与える劇的な変化とそのスピードを強調",
    mainContent: "最新のAIの事例や2025年の職場のビジョンを示すデータを用いる",
    reflection: "AIと共に働く未来が想像以上に近いことへの驚きと期待感を与える",
    cta: "読者にAIと共存する職場のビジョンを共有するよう促す"
  },
  topicTitle: "AIエージェントが変える未来の働き方：2025年の職場革命",
  topicUrl: "https://example.com/ai-workplace-revolution-2025"
}

async function generateContentWithCharacter(character, concept, voiceMode = 'normal') {
  const systemPrompt = `あなたは${character.name}という${character.age}歳の${character.gender}です。

【性格】
${character.tone}

【口癖】
「${character.catchphrase}」

【文体】
${character.voice_style[voiceMode]}

【得意なテーマ】
${character.topics.join('、')}

あなたのキャラクターとして、以下のコンセプトに基づいてTwitter投稿文を作成してください。
キャラクターの個性を強く反映させ、読者があなたの投稿だとすぐに分かるような文章にしてください。`

  const userPrompt = `以下のコンセプトを、${character.name}として投稿文に変換してください。

【トピック】
${concept.topicTitle}

【コンセプト構造】
1. オープニングフック: ${concept.structure.openingHook}
2. 背景: ${concept.structure.background}
3. 中身: ${concept.structure.mainContent}
4. 内省: ${concept.structure.reflection}
5. CTA: ${concept.structure.cta}

【要件】
- 135-140文字の範囲で作成
- ${character.name}の個性を強く反映
- ハッシュタグは2-3個
- URLを含める: ${concept.topicUrl}

JSON形式で出力してください：
{
  "content": "投稿本文",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "characterNote": "キャラクターらしさをどう表現したかの説明"
}`

  try {
    console.log('🎭 カーディ・ダーレとして投稿文を生成中...\n')
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1000
    })

    const content = response.choices[0].message.content || '{}'
    console.log('📝 GPTからの生の応答:')
    console.log(content)
    console.log('\n---\n')

    // JSONをパース
    let result = {}
    try {
      result = JSON.parse(content)
    } catch (e) {
      console.error('JSONパースエラー。コードブロックを探します...')
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0])
        } catch (e2) {
          console.error('抽出したJSONのパースにも失敗:', e2)
          return null
        }
      }
    }

    return result
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    return null
  }
}

async function testAllVoiceModes() {
  console.log('🚀 カーディ・ダーレ キャラクター投稿文生成テスト（GPT版）\n')
  console.log('📊 入力コンセプト:')
  console.log(`- トピック: ${testConcept.topicTitle}`)
  console.log(`- フック: ${testConcept.hookType}`)
  console.log(`- 角度: ${testConcept.angle}`)
  console.log('\n')

  const voiceModes = ['normal', 'emotional', 'humorous']
  
  for (const mode of voiceModes) {
    console.log(`\n========== ${mode.toUpperCase()} モード ==========`)
    
    const result = await generateContentWithCharacter(cardiDare, testConcept, mode)
    
    if (result) {
      console.log('\n✅ 生成された投稿文:')
      console.log(`\n${result.content}`)
      console.log(`\n文字数: ${result.content?.length || 0}文字`)
      console.log(`ハッシュタグ: ${result.hashtags?.join(', ') || 'なし'}`)
      console.log(`\n💡 キャラクター表現の説明:`)
      console.log(result.characterNote)
    } else {
      console.log('❌ 生成失敗')
    }
    
    // 次のテストまで少し待機
    if (mode !== 'humorous') {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log('\n\n✅ 全テスト完了！')
}

// テスト実行
testAllVoiceModes()