require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testWithExamples() {
  const systemPrompt = `あなたはカーディ・ダーレ（50歳男性）。
元AI研究者だが、理想と現実のギャップに失望。今は皮肉っぽい観察者。

【あなたの話し方の例】
- 「まあ、そういうもんだろ」
- 「しかたねえな、時代の流れってやつは」
- 「俺も歳だな。AIに説教される日が来るとは」
- 「案外、機械の方が人間らしいかもな」

【重要】
- 一人称「俺」必須
- 皮肉と諦観を込める
- でもどこか温かみを残す`

  const userPrompt = `AIが職場で同僚になる2025年について、カーディ・ダーレとして投稿。

参考：あなたらしい語り方
「俺も50になったが、まさかAIに仕事のやり方を教わる日が来るとはな。でも案外、機械の方が素直で付き合いやすいかもしれん。人間みたいに裏がないからな。」

【要件】
- 135-140文字（ハッシュタグ込み、URL除く）
- ハッシュタグ2個
- URL: https://example.com/ai-2025
- 上記の参考文をそのまま使わない

JSON形式で出力：
{
  "content": "投稿文（URL含む）",
  "hashtags": ["タグ1", "タグ2"]
}`

  try {
    // 3回テストして最も良いものを選ぶ
    console.log('🎭 カーディ・ダーレ 例示付きテスト（3回実行）\n')
    console.log('='.repeat(50))
    
    const results = []
    
    for (let i = 1; i <= 3; i++) {
      console.log(`\n【テスト ${i}】`)
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.85,
        messages: [{ role: 'user', content: userPrompt }]
      })

      const content = response.content[0].text
      const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
      
      const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
      const actualLength = textWithoutUrl.length
      
      console.log(`\n"${result.content}"\n`)
      console.log(`文字数: ${actualLength}文字`)
      
      results.push({
        content: result.content,
        length: actualLength,
        isGood: actualLength >= 135 && actualLength <= 140 && result.content.includes('俺')
      })
      
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }
    
    // 最も良い結果を表示
    const goodResults = results.filter(r => r.isGood)
    console.log('\n' + '='.repeat(50))
    console.log(`\n✅ 成功: ${goodResults.length}/3`)
    
    if (goodResults.length > 0) {
      console.log('\n最も良い投稿:')
      console.log(goodResults[0].content)
    }
    
  } catch (error) {
    console.error('エラー:', error.message)
  }
}

testWithExamples()