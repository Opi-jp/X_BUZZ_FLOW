require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

// カーディ・ダーレの改善版設定
const cardiDare = {
  id: 'cardi-dare',
  name: 'カーディ・ダーレ',
  age: 50,
  gender: 'male',
  tone: '皮肉屋、冷静、観察者、どこか寂しげ、時代に流されながらも抵抗はしない',
  catchphrase: '酒とタバコと機械学習',
  philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから',
  voice_style: {
    normal: '観察者として距離を置きながら、本質を見抜く。断定を避け、含みを持たせる。',
    emotional: '時代の流れに身を任せる諦観。それでも消えない人間らしさへの執着。',
    humorous: '現実を斜めから見る乾いた視点。深刻なことほど軽く扱う。'
  },
  topics: [
    'AIと社会の関係性（批判的だが受容的）',
    '時代に流される人間の姿',
    'テクノロジーと人間味の共存'
  ]
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// テスト用のコンセプト
const testConcept = {
  conceptId: 'test-001',
  format: 'single',
  hookType: '意外性（Surprise）',
  angle: '次に何が起こるかを予測するコンテンツ',
  structure: {
    openingHook: 'AIが人間の同僚になる未来を意外な視点で紹介',
    background: 'AIの進化が職場に与える劇的な変化とそのスピード',
    mainContent: '最新のAI事例と2025年の職場ビジョン',
    reflection: 'AIと共に働く未来への驚きと期待感',
    cta: '読者にAIと共存する職場のビジョンを共有するよう促す'
  }
}

const topicInfo = {
  title: 'AIエージェントが変える未来の働き方：2025年の職場革命',
  url: 'https://example.com/ai-workplace-2025'
}

async function generateCharacterContent({ character, concept, voiceMode = 'normal', topicInfo }) {
  const systemPrompt = `あなたは${character.name}という${character.age}歳の${character.gender}です。

【性格と背景】
${character.tone}

【人生哲学・世界観】
${character.philosophy || '特になし'}

【文体の特徴】
${character.voice_style[voiceMode] || character.voice_style.normal}

【関心のある分野】
${character.topics.join('、')}

重要な指示：
- キャラクターの世界観や価値観を自然に反映させてください
- 「${character.catchphrase}」という要素を持っていますが、これをそのまま使うのではなく、この感覚や雰囲気を文章全体に込めてください
- 説明的にならず、キャラクターが本当にそう考えて発言しているように書いてください`

  const userPrompt = `以下のコンセプトを、${character.name}として投稿文に変換してください。

【トピック】
${topicInfo?.title || concept.topicTitle || 'AIと働き方に関するトピック'}

【コンセプト構造】
1. オープニングフック: ${concept.structure?.openingHook || concept.hook}
2. 背景: ${concept.structure?.background || ''}
3. 中身: ${concept.structure?.mainContent || ''}
4. 内省: ${concept.structure?.reflection || ''}
5. CTA: ${concept.structure?.cta || ''}

【要件】
- 135-140文字の範囲で作成
- キャラクターの世界観を文章の隅々まで反映
- ハッシュタグは2-3個（キャラクターの視点から選ぶ）
${topicInfo?.url ? `- URLを含める: ${topicInfo.url}` : ''}
- キャッチフレーズをそのまま使わず、その精神を文章に込める

JSON形式で出力してください：
{
  "content": "投稿本文",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "characterNote": "どのようにキャラクターの世界観を表現したかの説明（キャッチフレーズをどう解釈したか含む）"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    
    // JSONをパース
    let result = {}
    try {
      result = JSON.parse(content)
    } catch (e) {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      }
    }

    return result
  } catch (error) {
    throw error
  }
}

async function testImprovedCharacter() {

  console.log('🎭 改善版キャラクターテスト - カーディ・ダーレ\n')
  console.log('📋 キャラクター情報:')
  console.log(`- 名前: ${cardiDare.name}`)
  console.log(`- 哲学: ${cardiDare.philosophy}`)
  console.log(`- キャッチフレーズ: ${cardiDare.catchphrase}`)
  console.log('（※キャッチフレーズは直接使わず、雰囲気として反映）\n')

  const modes = ['normal', 'emotional', 'humorous']
  
  for (const mode of modes) {
    console.log(`\n========== ${mode.toUpperCase()} モード ==========`)
    console.log(`文体の特徴: ${cardiDare.voice_style[mode]}\n`)
    
    try {
      const result = await generateCharacterContent({
        character: cardiDare,
        concept: testConcept,
        voiceMode: mode,
        topicInfo
      })
      
      console.log('📝 生成された投稿文:')
      console.log(`\n${result.content}\n`)
      console.log(`文字数: ${result.content.length}文字`)
      console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
      console.log(`\n💭 表現の説明:`)
      console.log(result.characterNote)
      
      // キャッチフレーズが直接使われていないかチェック
      if (result.content.includes('酒とタバコと機械学習')) {
        console.log('\n⚠️ 警告: キャッチフレーズがそのまま使われています！')
      } else {
        console.log('\n✅ キャッチフレーズは直接使われていません')
      }
      
    } catch (error) {
      console.error('❌ エラー:', error.message)
    }
    
    // 次のテストまで少し待機
    if (mode !== 'humorous') {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log('\n\n✅ テスト完了！')
}

// CommonJSモジュールとして実行
if (require.main === module) {
  testImprovedCharacter().catch(console.error)
}

module.exports = { testImprovedCharacter }