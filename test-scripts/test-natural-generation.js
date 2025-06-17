require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const cardiDare = {
  name: 'カーディ・ダーレ',
  age: 50,
  gender: 'male',
  philosophy: 'AIにしかたなく巻き込まれたけど、しかたねえだろ、そういう時代なんだから。元AI研究者だが、理想と現実のギャップに失望。今は皮肉っぽい観察者として、でも人間らしさは大切にしている。'
}

async function testNatural(isHumorous = false) {
  const prompt = `
あなたは${cardiDare.name}という${cardiDare.age}歳の男性です。

${cardiDare.philosophy}

今日は「AIが職場で同僚になる2025年」についてTwitterに投稿しようと思います。
あなたらしい視点で、140文字程度（URLは別）で投稿を書いてください。

${isHumorous ? 'いつもより少しユーモラスに、自虐的なジョークも交えて。' : ''}

投稿の最後には必ず https://example.com/ai-2025 を付けてください。
ハッシュタグも2つほど付けてください。

「俺」という一人称で、皮肉を込めつつも温かみのある語り方でお願いします。
`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = response.content[0].text || ''
    const post = content.trim()
    
    // 文字数計算（URL除く）
    const textWithoutUrl = post.replace(/https?:\/\/\S+/g, '').trim()
    const length = textWithoutUrl.length
    
    console.log(`\n【${isHumorous ? 'ユーモラス' : 'ノーマル'}モード】`)
    console.log('📝 生成された投稿:')
    console.log(`\n${post}\n`)
    console.log(`文字数（URL除く）: ${length}文字`)
    
    // 簡単なチェック
    const hasFirstPerson = post.includes('俺')
    const hasHashtags = post.includes('#')
    const hasUrl = post.includes('https://example.com')
    
    console.log(`\nチェック:`)
    console.log(`- 一人称「俺」: ${hasFirstPerson ? '✅' : '❌'}`)
    console.log(`- ハッシュタグ: ${hasHashtags ? '✅' : '❌'}`)
    console.log(`- URL: ${hasUrl ? '✅' : '❌'}`)
    
    return { post, length }
    
  } catch (error) {
    console.error('エラー:', error.message)
    return null
  }
}

// メイン実行
async function main() {
  console.log('🎭 カーディ・ダーレ 自然な生成テスト')
  console.log('='.repeat(50))
  
  // ノーマルモード
  await testNatural(false)
  
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // ユーモラスモード
  await testNatural(true)
  
  console.log('\n' + '='.repeat(50))
  console.log('\n✅ テスト完了')
}

main()