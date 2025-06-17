require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const cardiDare = {
  name: 'カーディ・ダーレ',
  age: 50,
  gender: '男性',
  tone: '皮肉屋、冷静、観察者、どこか寂しげ、時代に流されながらも抵抗はしない',
  philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから'
}

async function testSimpleVoice(voiceMode = 'normal') {
  // 基本のシステムプロンプト
  let systemPrompt = `あなたは${cardiDare.name}（${cardiDare.age}歳${cardiDare.gender}）です。

【性格】
${cardiDare.tone}

【基本姿勢】
${cardiDare.philosophy}

【話し方】
- 一人称「俺」で語る
- 皮肉を込めながらも、どこか温かみがある
- 時代に流されることを受け入れつつ、人間らしさは大切にする`

  // ユーモラスモードの場合のみ追加指示
  if (voiceMode === 'humorous') {
    systemPrompt += `

【ユーモラスモードの指示】
- ブラックユーモアと自虐を使う
- 深刻な話題を軽妙に皮肉る
- 笑いを交えながらも、核心は外さない
- 例：「AIに仕事を奪われる？俺はもう奪われてるから関係ないな（笑）」`
  }

  const userPrompt = `AIが職場で同僚になる2025年について投稿してください。

【要件】
- 135-140文字（ハッシュタグ込み、URL除く）
- ハッシュタグ2個
- URL: https://example.com/ai-2025

JSON形式で出力：
{
  "content": "投稿文（URL含む）",
  "hashtags": ["タグ1", "タグ2"]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: voiceMode === 'humorous' ? 0.9 : 0.8,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length
    
    console.log(`\n【${voiceMode.toUpperCase()}モード】`)
    console.log('📝 投稿:')
    console.log(`\n${result.content}\n`)
    console.log(`文字数: ${actualLength}文字`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    
    return actualLength >= 135 && actualLength <= 140
    
  } catch (error) {
    console.error('エラー:', error.message)
    return false
  }
}

// ノーマルとユーモラスの比較テスト
async function main() {
  console.log('🎭 カーディ・ダーレ シンプル音声モードテスト')
  console.log('='.repeat(50))
  
  // ノーマルモード
  const normalSuccess = await testSimpleVoice('normal')
  
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // ユーモラスモード
  const humorousSuccess = await testSimpleVoice('humorous')
  
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 結果:')
  console.log(`- ノーマル: ${normalSuccess ? '✅' : '❌'}`)
  console.log(`- ユーモラス: ${humorousSuccess ? '✅' : '❌'}`)
}

main()