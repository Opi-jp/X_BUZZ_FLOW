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
  philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから',
  voice_style: {
    normal: 'ハードボイルド小説の語り手のような文体。短い断片的な文で核心を突く。'
  }
}

async function testFirstPerson() {
  const systemPrompt = `あなたは${cardiDare.name}本人です。
一人称で語ってください。地の文ではなく、本人の言葉として。

【あなたの性格】
${cardiDare.tone}

【あなたの哲学】
${cardiDare.philosophy}

【あなたの語り方】
${cardiDare.voice_style.normal}

【重要】
- 必ず「俺」で語る（50歳男性なので）
- 地の文や説明文にならない
- あなた自身の考えや感情を直接表現する
- 「酒とタバコと機械学習」という言葉は使わない`

  const userPrompt = `AIが職場で同僚になる2025年について、あなたの言葉でツイートしてください。

【要件】
- 一人称「俺」で語る
- 135-140文字（ハッシュタグ込み、URL除く）
- ハッシュタグ2個
- 最後にURL: https://example.com/ai-2025

【良い例（137文字）】
「俺も50歳。AIの波に飲まれてる。でも案外、悪くないかもな。機械は嘘をつかない。人間みたいに裏切らない。ただ、最後の一杯を傾ける相手は、やっぱり人間がいい。そういうもんだろ？#AI時代 #人間らしさ」

JSON形式で出力：
{
  "content": "投稿本文（URL含む）",
  "hashtags": ["タグ1", "タグ2"],
  "textLength": URL除く文字数
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
    
    console.log('📝 カーディ・ダーレの投稿:')
    console.log(`\n「${result.content}」\n`)
    console.log(`文字数: ${actualLength}文字（報告: ${result.textLength}文字）`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    
    // チェック
    const checks = {
      lengthOK: actualLength >= 135 && actualLength <= 140,
      hasFirstPerson: result.content.includes('俺'),
      noCatchphrase: !result.content.includes('酒とタバコと機械学習'),
      notDescriptive: !result.content.includes('彼は') && !result.content.includes('カーディは')
    }
    
    console.log('\n✅ チェック結果:')
    Object.entries(checks).forEach(([key, value]) => {
      const labels = {
        lengthOK: '文字数(135-140)',
        hasFirstPerson: '一人称使用',
        noCatchphrase: 'キャッチフレーズ不使用',
        notDescriptive: '地の文でない'
      }
      console.log(`- ${labels[key]}: ${value ? '✅' : '❌'}`)
    })
    
    return Object.values(checks).every(v => v)
    
  } catch (error) {
    console.error('エラー:', error.message)
    return false
  }
}

// 5回テスト
async function main() {
  console.log('🎭 カーディ・ダーレ 一人称テスト\n')
  console.log('目標: 本人の語りとして135-140文字\n')
  console.log('='.repeat(50))
  
  let successCount = 0
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n【テスト ${i}/5】`)
    if (await testFirstPerson()) {
      successCount++
    }
    
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 成功率: ${successCount}/5 (${successCount * 20}%)\n`)
}

main()