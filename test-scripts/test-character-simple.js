require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function generateSimple() {
  const systemPrompt = `あなたはカーディ・ダーレ（50歳男性）。
皮肉屋で観察者。AIの時代を冷めた目で見ているが、結局は受け入れている。
「酒とタバコと機械学習」の精神を持つが、この言葉は使わない。`

  const userPrompt = `AIが職場で同僚になる2025年について投稿文を作成。

以下の文章は全て同じ長さ（80文字）の例です：
「AIが同僚になる時代か。データの渦に身を任せ、夜更けに一杯傾けながら考える。人の温もりは消えゆくのか。いや、きっと違う形で残るはずだ。」

この例を参考に、以下の長さで作成してください：
- 最小：135文字（上の例の約1.7倍）
- 最大：140文字（上の例の約1.75倍）

必須要素：
- ハッシュタグ2個を含む
- 最後にURL: https://example.com/ai-2025
- カーディらしい皮肉と諦観

出力形式：
{
  "content": "完成した投稿文（URL含む）",
  "length": URLを除いた文字数
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length
    
    console.log('📝 生成された投稿文:')
    console.log(`\n${result.content}\n`)
    console.log(`実際の文字数: ${actualLength}文字`)
    console.log(`報告された文字数: ${result.length}文字`)
    
    const isOK = actualLength >= 135 && actualLength <= 140
    console.log(`\n判定: ${isOK ? '✅ 成功' : '❌ 失敗'} (${actualLength}文字)`)
    
    return isOK
    
  } catch (error) {
    console.error('エラー:', error.message)
    return false
  }
}

// 10回テスト
async function main() {
  console.log('🎭 カーディ・ダーレ シンプルテスト（10回）\n')
  
  let successCount = 0
  
  for (let i = 1; i <= 10; i++) {
    console.log(`\n=== テスト ${i}/10 ===`)
    if (await generateSimple()) {
      successCount++
    }
    if (i < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  console.log(`\n\n📊 最終結果: ${successCount}/10 成功 (${successCount * 10}%)`)
}

main()