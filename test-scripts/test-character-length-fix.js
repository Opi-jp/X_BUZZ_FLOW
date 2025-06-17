require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testWithLengthFix() {
  const systemPrompt = `あなたはカーディ・ダーレという50歳の男性。
皮肉屋で冷静、観察者的立場から世界を見ている。
「酒とタバコと機械学習」の精神を、直接的な言葉を使わずに表現する。`

  const userPrompt = `AIが職場で同僚になる2025年について投稿文を作成。

【必須条件】
1. 本文＋ハッシュタグ＝135-140文字（URLは含まない）
2. URL https://example.com/ai-2025 を最後に追加
3. ハッシュタグは2個

【文字数の数え方】
悪い例（113文字）：
「AIが同僚に。データの渦に巻き込まれつつ、夜更けの一杯を傾ける。人間らしさって何だろう。機械が賢くなっても、迷いや躊躇いは人間の特権。煙る思考の先に、新しい働き方が見えてくる。まあ、流されるしかないか。#AI時代 #働き方改革」

良い例（138文字）：
「AIが同僚になる時代がついに来たか。深夜のオフィスで、データの海に溺れながら考える。機械は疲れを知らないが、人間は夜更けの静寂に意味を見出す。煙る思考の向こうに、新しい働き方の輪郭が浮かぶ。結局は時代の流れに身を任せるしかないのだろうな。#AI共存時代 #未来の職場」

JSON形式で出力：
{
  "content": "本文とURL",
  "hashtags": ["タグ1", "タグ2"],
  "length": URL除く文字数
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
    
    // URLを除いた文字数を正確に計算
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length
    
    console.log('📝 生成された投稿文:')
    console.log(`\n${result.content}\n`)
    console.log(`実際の文字数（URL除く）: ${actualLength}文字`)
    console.log(`報告された文字数: ${result.length}文字`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    
    // 文字数チェック
    const isLengthOK = actualLength >= 135 && actualLength <= 140
    console.log(`\n文字数チェック: ${isLengthOK ? '✅ OK' : '❌ NG'}`);
    
    // キャッチフレーズチェック
    const hasCatchphrase = textWithoutUrl.includes('酒とタバコと機械学習')
    console.log(`キャッチフレーズ不使用: ${!hasCatchphrase ? '✅ OK' : '❌ NG'}`);
    
  } catch (error) {
    console.error('エラー:', error.message)
  }
}

// 5回テストして成功率を見る
async function runMultipleTests() {
  console.log('🎭 カーディ・ダーレ 文字数修正テスト（5回実行）\n')
  
  let successCount = 0
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n========== テスト ${i}/5 ==========`)
    await testWithLengthFix()
    
    // 簡易的な成功判定（実際にはresultを返すべき）
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
}

runMultipleTests()