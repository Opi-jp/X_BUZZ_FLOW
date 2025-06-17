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
  }
}

async function generateFixed() {
  const systemPrompt = `あなたはカーディ・ダーレという50歳の男性です。

【性格と背景】
${cardiDare.tone}

【人生哲学・世界観】
${cardiDare.philosophy}

【文体の特徴】
${cardiDare.voice_style.normal}

重要：「${cardiDare.catchphrase}」の直接使用は避け、その精神を文章に込める。`

  const userPrompt = `以下のコンテンツを作成してください。

【トピック】
AIエージェントが変える未来の働き方

【コンセプト】
- AIが人間の同僚になる未来
- 2025年の職場革命
- 驚きと期待感

【厳密な要件】
1. 本文を書く
2. ハッシュタグを2個追加（#○○ 形式）
3. 本文＋ハッシュタグの合計が135-140文字
4. 最後にスペースを入れてURL追加: https://example.com/ai-2025
5. 全体の構成: 本文＋ハッシュタグ（135-140文字）＋スペース＋URL

【出力例（137文字＋URL）】
AIが同僚になる時代がついに来たか。深夜、データの海に溺れながら思う。機械は疲れを知らないが、人間は夜更けの静寂に意味を見出す。煙る思考の向こうに新しい働き方が見える。時代の流れに身を任せるしかないのだろうな。#AI共存 #働き方改革 https://example.com/ai-2025

JSON形式で出力：
{
  "content": "本文＋ハッシュタグ＋URL（全て含む完成形）",
  "hashtags": ["タグ1", "タグ2"],
  "textLength": 本文＋ハッシュタグの文字数（URL除く）,
  "characterNote": "キャラクター表現の説明"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    // 実際の文字数を確認
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length
    
    console.log('📝 生成された投稿文:')
    console.log(`\n${result.content}\n`)
    console.log(`実際の文字数（URL除く）: ${actualLength}文字`)
    console.log(`Claudeの報告: ${result.textLength}文字`)
    console.log(`ハッシュタグ: ${result.hashtags.join(', ')}`)
    console.log(`\n💭 ${result.characterNote}`)
    
    // チェック
    const checks = {
      length: actualLength >= 135 && actualLength <= 140,
      noCatchphrase: !result.content.includes('酒とタバコと機械学習'),
      hasUrl: result.content.includes('https://example.com/ai-2025'),
      hasHashtags: result.content.includes('#')
    }
    
    console.log('\n✅ チェック結果:')
    console.log(`- 文字数(135-140): ${checks.length ? '✅' : '❌'} (${actualLength}文字)`)
    console.log(`- キャッチフレーズ不使用: ${checks.noCatchphrase ? '✅' : '❌'}`)
    console.log(`- URL含む: ${checks.hasUrl ? '✅' : '❌'}`)
    console.log(`- ハッシュタグ含む: ${checks.hasHashtags ? '✅' : '❌'}`)
    
    return checks.length && checks.noCatchphrase
    
  } catch (error) {
    console.error('エラー:', error.message)
    return false
  }
}

// メイン実行
async function main() {
  console.log('🎭 カーディ・ダーレ 最終テスト\n')
  
  let successCount = 0
  const totalTests = 3
  
  for (let i = 1; i <= totalTests; i++) {
    console.log(`\n========== テスト ${i}/${totalTests} ==========`)
    const success = await generateFixed()
    if (success) successCount++
    
    if (i < totalTests) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  console.log(`\n\n📊 成功率: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)`)
}

main()