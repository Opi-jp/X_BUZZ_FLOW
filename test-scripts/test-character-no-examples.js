require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const cardiDare = {
  name: 'カーディ・ダーレ',
  age: 50,
  gender: 'male',
  tone: '皮肉屋、冷静、観察者、どこか寂しげ、時代に流されながらも抵抗はしない',
  catchphrase: '酒とタバコと機械学習',
  philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから',
  voice_style: {
    normal: '観察者として距離を置きながら、本質を見抜く。断定を避け、含みを持たせる。'
  },
  topics: ['AIと社会の関係性（批判的だが受容的）', '時代に流される人間の姿']
}

async function testNoExamples() {
  const systemPrompt = `あなたは${cardiDare.name}という${cardiDare.age}歳の${cardiDare.gender}です。

【性格と背景】
${cardiDare.tone}

【人生哲学・世界観】
${cardiDare.philosophy}

【文体の特徴】
${cardiDare.voice_style.normal}

重要な指示：
- キャラクターの世界観を独自の表現で反映してください
- 「${cardiDare.catchphrase}」は使用禁止です
- このキャラクターならではの独特な言い回しを創造してください
- 具体的な例は示しません。あなたの創造性で表現してください`

  const userPrompt = `AIが職場で同僚になる2025年について投稿文を作成。

【要件】
- 135文字以上140文字以下（URLは含めない）
- ハッシュタグ2個含む
- 最後にURL: https://example.com/ai-2025
- カーディ・ダーレの個性を独自の表現で

出力形式：
{
  "content": "投稿文（URL含む）",
  "hashtags": ["タグ1", "タグ2"],
  "uniqueExpressions": "使用した独自表現の説明"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.8,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length
    
    console.log('📝 生成された投稿文:')
    console.log(`\n${result.content}\n`)
    console.log(`文字数（URL除く）: ${actualLength}文字`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    console.log(`\n🎨 独自表現の説明:`)
    console.log(result.uniqueExpressions)
    
    // チェック
    const checks = {
      lengthOK: actualLength >= 135 && actualLength <= 140,
      noCatchphrase: !result.content.includes('酒とタバコと機械学習'),
      noExamplePhrases: !result.content.includes('データの海') && 
                       !result.content.includes('煙る思考') && 
                       !result.content.includes('夜更け') &&
                       !result.content.includes('深夜')
    }
    
    console.log('\n✅ チェック結果:')
    console.log(`- 文字数: ${checks.lengthOK ? '✅' : '❌'}`)
    console.log(`- キャッチフレーズ不使用: ${checks.noCatchphrase ? '✅' : '❌'}`)
    console.log(`- 例示フレーズ不使用: ${checks.noExamplePhrases ? '✅' : '❌'}`)
    
    return Object.values(checks).every(v => v)
    
  } catch (error) {
    console.error('エラー:', error.message)
    return false
  }
}

// 5回テスト
async function main() {
  console.log('🎭 カーディ・ダーレ 例示なしテスト\n')
  
  let successCount = 0
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n========== テスト ${i}/5 ==========`)
    if (await testNoExamples()) {
      successCount++
    }
    
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log(`\n\n📊 成功率: ${successCount}/5 (${successCount * 20}%)`)
}

main()