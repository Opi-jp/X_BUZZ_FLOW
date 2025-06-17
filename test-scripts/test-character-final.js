require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// カーディ・ダーレの最終版設定
const cardiDare = {
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
  }
}

const testConcept = {
  structure: {
    openingHook: 'AIが人間の同僚になる未来を意外な視点で紹介',
    background: 'AIの進化が職場に与える劇的な変化',
    mainContent: '2025年の職場ビジョン',
    reflection: 'AIと共に働く未来への驚きと期待感',
    cta: '読者にビジョンを共有するよう促す'
  }
}

async function testFinalCharacter() {
  const systemPrompt = `あなたはカーディ・ダーレという50歳の男性です。

【重要な指示】
- 「酒とタバコと機械学習」というフレーズをそのまま使わない
- 代わりに、夜の静寂、煙る思考、データの海、深夜の一杯、といった詩的な表現を使う
- 本文＋ハッシュタグで135-140文字（URLは含めない）

【性格】
${cardiDare.tone}

【世界観】
${cardiDare.philosophy}

【文体】
${cardiDare.voice_style.normal}

良い例：
「AIが同僚になる時代か。データの海に溺れながらも、人は変わらず迷い続ける。夜の静寂に包まれて思う、結局は流されるしかないのかもな。」

悪い例：
「AIと酒とタバコと機械学習の時代が来た」（キャッチフレーズを直接使用）`

  const userPrompt = `以下のコンセプトで、カーディ・ダーレとして投稿文を作成してください。

【トピック】AIエージェントが変える未来の働き方

【コンセプト】
${JSON.stringify(testConcept.structure, null, 2)}

【要件】
- 本文＋ハッシュタグで135-140文字（URLは除く）
- ハッシュタグ2個
- URL: https://example.com/ai-2025 を最後に配置
- キャッチフレーズの直接使用は避け、雰囲気を表現

JSON形式で出力：
{
  "content": "投稿本文",
  "hashtags": ["タグ1", "タグ2"],
  "characterNote": "表現の説明"
}`

  try {
    console.log('🎭 最終版キャラクターテスト\n')
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    console.log('📝 生成された投稿文:')
    console.log(`\n${result.content}\n`)
    console.log(`文字数: ${result.content.length}文字`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    console.log(`\n💭 表現の説明:`)
    console.log(result.characterNote)
    
    // URLを除いた文字数を計算
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '')
    const actualLength = textWithoutUrl.length
    
    // チェック
    const checks = {
      lengthOK: actualLength >= 135 && actualLength <= 140,
      noCatchphrase: !result.content.includes('酒とタバコと機械学習'),
      hasURL: result.content.includes('https://example.com/ai-2025')
    }
    
    console.log('\n✅ チェック結果:')
    console.log(`- 文字数: ${checks.lengthOK ? '✅' : '❌'} (URL除く: ${actualLength}文字)`)
    console.log(`- キャッチフレーズ不使用: ${checks.noCatchphrase ? '✅' : '❌'}`)
    console.log(`- URL含む: ${checks.hasURL ? '✅' : '❌'}`)
    
  } catch (error) {
    console.error('❌ エラー:', error.message)
  }
}

testFinalCharacter()