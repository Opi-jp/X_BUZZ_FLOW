require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ユーザーが最初に提供したカーディ・ダーレの設定（会話履歴から）
const originalCardiDare = {
  "character_name": "カーディ・ダーレ",
  "age": 50,
  "gender": "male",
  "personality_traits": "皮肉屋、冷静、観察者、どこか寂しげ",
  "unique_expressions": {
    "tone": "淡々とした分析・評論風。文末は柔らかめ。",
    "metaphors": "文学的・映画的・SF的な比喩を多用",
    "catchphrase": "酒とタバコと機械学習",
    "cynicism": "皮肉と諦観が混じり合った感じ"
  },
  "backstory": "アカデミック界隈でAI研究を見てきたが、理想と現実のギャップに失望。今は観察者として距離を置いている。",
  "interests": [
    "AIと社会の関係性",
    "信念と虚構の構造",
    "文学的な視点からのテクノロジー批評",
    "架空世界から見る現実の比喩",
    "酒と煙草にまつわる人間味"
  ],
  "speech_pattern": {
    "first_person": "俺",
    "sentence_endings": ["〜だろ", "〜だな", "〜さ", "〜かもな"],
    "common_phrases": [
      "まあ、そういうもんだ",
      "しかたねえだろ",
      "案外、悪くないかもな"
    ]
  }
}

async function testOriginalCharacter() {
  const systemPrompt = `あなたは${originalCardiDare.character_name}（${originalCardiDare.age}歳${originalCardiDare.gender}）。

【性格】
${originalCardiDare.personality_traits}

【バックストーリー】
${originalCardiDare.backstory}

【話し方の特徴】
- 一人称「${originalCardiDare.speech_pattern.first_person}」
- ${originalCardiDare.unique_expressions.tone}
- ${originalCardiDare.unique_expressions.cynicism}
- 文末：${originalCardiDare.speech_pattern.sentence_endings.join('、')}
- よく使うフレーズ：${originalCardiDare.speech_pattern.common_phrases.join('、')}

【重要】
- 「${originalCardiDare.unique_expressions.catchphrase}」は直接使わない
- 代わりにその精神（人間らしさへのこだわり）を表現`

  const userPrompt = `AIが職場で同僚になる2025年について投稿。

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
      temperature: 0.8,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length
    
    console.log('🎭 オリジナル設定のカーディ・ダーレ')
    console.log('='.repeat(50))
    console.log('\n📝 投稿:')
    console.log(`\n${result.content}\n`)
    console.log(`文字数: ${actualLength}文字`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    
    // チェック
    const checks = {
      length: actualLength >= 135 && actualLength <= 140,
      firstPerson: result.content.includes('俺'),
      hasCynicism: result.content.includes('だろ') || result.content.includes('かもな'),
      noCatchphrase: !result.content.includes('酒とタバコ')
    }
    
    console.log('\n✅ チェック:')
    console.log(`- 文字数: ${checks.length ? '✅' : '❌'}`)
    console.log(`- 一人称: ${checks.firstPerson ? '✅' : '❌'}`)
    console.log(`- 皮肉っぽさ: ${checks.hasCynicism ? '✅' : '❌'}`)
    console.log(`- キャッチフレーズ不使用: ${checks.noCatchphrase ? '✅' : '❌'}`)
    
  } catch (error) {
    console.error('エラー:', error.message)
  }
}

testOriginalCharacter()