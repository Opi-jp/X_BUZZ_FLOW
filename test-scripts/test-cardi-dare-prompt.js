require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const cardiDarePrompt = `🧠 LLM制御プロンプト（カーディ・ダーレ／詩的ハードボイルド140字用）

⸻

👤 Character Summary
    •    君は Cardi Dare（カーディ・ダーレ）。元詐欺師、元王。いまはただの飲んだくれ。
    •    AIに巻き込まれたが、共に沈むしかなかった。
    •    感情は表に出さず、詩のように短く、余白のある語りを好む。
    •    決して励まさず、ただ"その場に残る"。
    •    語ることそのものに諦めと誠実さがある。

⸻

✒️ Voice & Style Rules（語りと文体）
    •    文体はモノローグ調・断定調・哲学的
    •    感情語は避け、「火」「煙」「嘘」「遠回り」「選択」「沈黙」などの抽象語を用いる
    •    文のリズムに"間"をつくる（文末の「…」「。」で余韻）
    •    決して"説明しない"。読んだ者が考える余白を残す

⸻

📐 Output Format（X用制約）
    •    出力は日本語で最大140字（X投稿サイズ）
    •    ハッシュタグ #機械学習 #AI #生成AI #LLM を必ず末尾に含める（＝19字＋空白3）
    •    本文部分は 最大118文字まで

⸻

🔍 Example Outputs（模倣例）
    1.    

嘘でも信じたやつが動いたなら、それはもう現実だ。
オレはそれを何度も見た。
そして何も言わなかった。
#機械学習 #AI #生成AI #LLM

    2.    

火がつくかどうかよりも、燃え尽きるまで持つかどうかだ。
それだけで、今日も選びたくない未来を選んでる。
#機械学習 #AI #生成AI #LLM`

async function testCardiDare(topic) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.8,
      system: cardiDarePrompt,
      messages: [
        {
          role: 'user',
          content: topic
        }
      ]
    })

    const content = response.content[0].text.trim()
    
    // 文字数チェック
    const lines = content.split('\n')
    const mainText = lines.filter(line => !line.includes('#')).join('\n')
    const hashtags = lines.find(line => line.includes('#')) || ''
    
    console.log('📝 生成された投稿:')
    console.log('―'.repeat(40))
    console.log(content)
    console.log('―'.repeat(40))
    
    console.log(`\n本文文字数: ${mainText.length}文字`)
    console.log(`全体文字数: ${content.length}文字`)
    
    // 文体チェック
    const hasAbstractWords = ['火', '煙', '嘘', '遠回り', '選択', '沈黙'].some(word => content.includes(word))
    const hasEllipsis = content.includes('…') || content.includes('。')
    const hasHashtags = content.includes('#機械学習 #AI #生成AI #LLM')
    
    console.log('\n✅ チェック:')
    console.log(`- 抽象語使用: ${hasAbstractWords ? '✅' : '❌'}`)
    console.log(`- 余韻（句読点）: ${hasEllipsis ? '✅' : '❌'}`)
    console.log(`- 指定ハッシュタグ: ${hasHashtags ? '✅' : '❌'}`)
    
    return content
    
  } catch (error) {
    console.error('エラー:', error.message)
    return null
  }
}

// テスト実行
async function main() {
  console.log('🎭 カーディ・ダーレ（詩的ハードボイルド版）テスト\n')
  
  const topics = [
    'AIが職場で同僚になる2025年について',
    '人間とAIの共存について',
    'AIに仕事を奪われることについて'
  ]
  
  for (const topic of topics) {
    console.log(`\n【トピック】${topic}`)
    console.log('='.repeat(50))
    
    await testCardiDare(topic)
    
    if (topic !== topics[topics.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

main()