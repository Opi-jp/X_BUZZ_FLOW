require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const cardiDare = {
  name: 'カーディ・ダーレ',
  age: 50,
  gender: 'male',
  philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから',
  styles: {
    normal: 'ハードボイルド小説の語り手のような文体。短い断片的な文で核心を突く。',
    emotional: '映画のモノローグのような内省的な語り。時代への諦観と人間への愛着が交錯。',
    humorous: 'ブラックユーモアと自虐。深刻な話題を軽妙に皮肉る。'
  }
}

async function testCinematicStyle(voiceMode = 'normal') {
  const systemPrompt = `あなたは${cardiDare.name}。${cardiDare.age}歳の男性。
${cardiDare.philosophy}

【文体】
${cardiDare.styles[voiceMode]}

【重要な指示】
- 映画の台詞や文学作品の一節のような、味わい深い表現を使う
- 「酒とタバコと機械学習」という言葉は絶対に使わない
- 具体的すぎる表現（データの海、煙る思考など）も避ける
- そのキャラクターが実際に映画で語りそうな台詞を考える`

  const userPrompt = `AIが職場で同僚になる2025年について、${voiceMode}モードで投稿文を作成。

【参考となる表現の方向性】
- レイモンド・チャンドラーのフィリップ・マーロウ
- ブレードランナーのロイ・バッティ
- タクシードライバーのトラヴィス

【要件】
- 135-140文字（URL除く）
- ハッシュタグ2個
- URL: https://example.com/ai-2025
- 映画的・文学的な独自表現

出力：
{
  "content": "投稿文",
  "hashtags": ["タグ1", "タグ2"],
  "styleNote": "どんな映画的表現を使ったか"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.9,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0].text
    const result = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    
    const textWithoutUrl = result.content.replace(/https?:\/\/\S+/g, '').trim()
    const actualLength = textWithoutUrl.length
    
    console.log(`📽️ ${voiceMode.toUpperCase()}モード:`)
    console.log(`\n"${result.content}"\n`)
    console.log(`文字数: ${actualLength}文字`)
    console.log(`スタイル: ${result.styleNote}`)
    
    return {
      success: actualLength >= 135 && actualLength <= 140,
      length: actualLength,
      content: result.content
    }
    
  } catch (error) {
    console.error('エラー:', error.message)
    return { success: false }
  }
}

// 3つのモードでテスト
async function main() {
  console.log('🎬 カーディ・ダーレ 映画的表現テスト\n')
  console.log('='.repeat(50))
  
  const modes = ['normal', 'emotional', 'humorous']
  const results = []
  
  for (const mode of modes) {
    console.log(`\n`)
    const result = await testCinematicStyle(mode)
    results.push({ mode, ...result })
    
    if (mode !== 'humorous') {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 結果サマリー:')
  
  results.forEach(r => {
    console.log(`\n${r.mode}: ${r.success ? '✅' : '❌'} (${r.length}文字)`)
    if (r.success) {
      console.log(`→ ${r.content}`)
    }
  })
  
  const successCount = results.filter(r => r.success).length
  console.log(`\n総合成功率: ${successCount}/3 (${Math.round(successCount/3*100)}%)`)
}

main()