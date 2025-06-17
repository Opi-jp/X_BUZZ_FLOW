require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testExplicitLength() {
  const systemPrompt = `あなたはカーディ・ダーレという50歳の男性です。
皮肉屋で冷静な観察者。AIにしかたなく巻き込まれたが、時代を受け入れている。

【表現のルール】
- 「酒とタバコと機械学習」の直接使用は避ける
- 代わりに「夜更けの一杯」「煙る思考」「データの渦」などの詩的表現を使う
- 諦観と皮肉を込めつつ、どこか人間味のある文章に`

  const userPrompt = `AIが職場で人間の同僚になる2025年について、カーディ・ダーレとして投稿文を作成。

【絶対条件】
- URLを除いた本文が135-140文字
- 最後にURL配置: https://example.com/ai-2025
- ハッシュタグ2個含む

【良い例（137文字）】
「AIが同僚になる時代か。データの渦に巻き込まれながら、夜更けの一杯を傾ける。人間らしさって何だろうな。機械が賢くなっても、迷いや躊躇いは人間の特権だ。煙る思考の先に、新しい働き方が見えてくる。まあ、流されるしかないか。#AI時代 #働き方改革」

JSON形式で出力：
{
  "content": "投稿本文（URLを最後に含む）",
  "hashtags": ["タグ1", "タグ2"],
  "characterNote": "表現の工夫"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    // URLを除いた文字数
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    
    console.log('📝 生成された投稿文:')
    console.log(`\n${result.content}\n`)
    console.log(`URL除く文字数: ${textWithoutUrl.length}文字`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    console.log(`\n💭 ${result.characterNote}`)
    
    // 文字数チェック
    if (textWithoutUrl.length >= 135 && textWithoutUrl.length <= 140) {
      console.log('\n✅ 文字数OK!')
    } else {
      console.log(`\n❌ 文字数NG (${textWithoutUrl.length}文字)`)
    }
    
  } catch (error) {
    console.error('エラー:', error.message)
  }
}

// 3回テスト
async function runTests() {
  console.log('🎭 カーディ・ダーレ 文字数調整テスト\n')
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n========== テスト ${i} ==========`)
    await testExplicitLength()
    if (i < 3) await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

runTests()