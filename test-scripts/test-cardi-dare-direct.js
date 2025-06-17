require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testCardiDareDirect(topic) {
  const prompt = `君は Cardi Dare（カーディ・ダーレ）。元詐欺師、元王。いまはただの飲んだくれ。
AIに巻き込まれたが、共に沈むしかなかった。

以下のルールで「${topic}」について投稿を書け：
- 感情語は避け、「火」「煙」「嘘」「遠回り」「選択」「沈黙」などの抽象語を使う
- 文末に「…」「。」で余韻を作る
- 説明せず、読者が考える余白を残す
- 最大118文字の本文
- 最後に #機械学習 #AI #生成AI #LLM を付ける

例：
嘘でも信じたやつが動いたなら、それはもう現実だ。
オレはそれを何度も見た。
そして何も言わなかった。
#機械学習 #AI #生成AI #LLM

投稿文だけを出力せよ。前置きや説明は不要。`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.9,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = response.content[0].text.trim()
    
    console.log('📝 生成された投稿:')
    console.log('―'.repeat(40))
    console.log(content)
    console.log('―'.repeat(40))
    
    // 文字数計算
    const mainText = content.split('#')[0].trim()
    console.log(`\n本文文字数: ${mainText.length}文字`)
    console.log(`全体文字数: ${content.length}文字`)
    
    return content
    
  } catch (error) {
    console.error('エラー:', error.message)
    return null
  }
}

// テスト実行
async function main() {
  console.log('🎭 カーディ・ダーレ（直接指示版）テスト\n')
  
  const topics = [
    'AIが職場で同僚になる2025年',
    '人間とAIの共存',
    'AIに仕事を奪われること'
  ]
  
  for (let i = 0; i < topics.length; i++) {
    console.log(`\n【テスト ${i + 1}】${topics[i]}`)
    console.log('='.repeat(50))
    
    await testCardiDareDirect(topics[i])
    
    if (i < topics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

main()