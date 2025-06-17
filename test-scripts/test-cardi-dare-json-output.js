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

async function testCardiDareJsonOutput(topic) {
  const userPrompt = `${topic}について語れ。

出力は以下のJSON形式で：
{
  "post": "投稿文全体（ハッシュタグ含む）"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.85,
      system: cardiDarePrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0].text.trim()
    
    // JSONパース試行
    let parsed
    try {
      // マークダウンコードブロックを除去
      const cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '')
      // JSON文字列内の改行を処理
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = JSON.parse(cleanContent)
      }
    } catch (e) {
      console.log('⚠️ JSONパースエラー、生の出力:')
      console.log(content)
      // 手動でpostを抽出
      const postMatch = content.match(/"post":\s*"([^"]+(?:\\.[^"]+)*)"/s)
      if (postMatch) {
        const postContent = postMatch[1].replace(/\\n/g, '\n').replace(/\\/g, '')
        parsed = { post: postContent }
      } else {
        return null
      }
    }
    
    console.log('📝 生成された投稿:')
    console.log('―'.repeat(40))
    console.log(parsed.post)
    console.log('―'.repeat(40))
    
    // 文字数チェック
    const mainText = parsed.post.split('#')[0].trim()
    console.log(`\n本文文字数: ${mainText.length}文字`)
    console.log(`全体文字数: ${parsed.post.length}文字`)
    
    // 文体チェック
    const hasAbstractWords = ['火', '煙', '嘘', '遠回り', '選択', '沈黙'].some(word => parsed.post.includes(word))
    const hasEllipsis = parsed.post.includes('…') || parsed.post.includes('。')
    const hasHashtags = parsed.post.includes('#機械学習 #AI #生成AI #LLM')
    
    console.log('\n✅ チェック:')
    console.log(`- 抽象語使用: ${hasAbstractWords ? '✅' : '❌'}`)
    console.log(`- 余韻（句読点）: ${hasEllipsis ? '✅' : '❌'}`)
    console.log(`- 指定ハッシュタグ: ${hasHashtags ? '✅' : '❌'}`)
    console.log(`- 文字数適正（100-118文字）: ${mainText.length >= 100 && mainText.length <= 118 ? '✅' : '❌'}`)
    
    return parsed.post
    
  } catch (error) {
    console.error('エラー:', error.message)
    return null
  }
}

// テスト実行
async function main() {
  console.log('🎭 カーディ・ダーレ（JSON出力指定版）テスト\n')
  console.log('詩的ハードボイルドスタイル + JSON出力形式')
  console.log('='.repeat(60))
  
  const topics = [
    'AIが職場で同僚になる2025年',
    '人間とAIの共存',
    'AIに仕事を奪われること',
    'AIと共に働く未来',
    '機械学習の進化'
  ]
  
  const results = []
  
  for (const topic of topics) {
    console.log(`\n📌 ${topic}`)
    
    const post = await testCardiDareJsonOutput(topic)
    if (post) {
      const mainText = post.split('#')[0].trim()
      results.push({
        topic,
        post,
        length: mainText.length,
        isGood: mainText.length >= 100 && mainText.length <= 118
      })
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  // 結果まとめ
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 結果サマリー:')
  
  const goodPosts = results.filter(r => r.isGood)
  console.log(`成功率: ${goodPosts.length}/${results.length}`)
  
  if (goodPosts.length > 0) {
    console.log('\n✨ ベスト投稿:')
    const best = goodPosts[0]
    console.log('―'.repeat(40))
    console.log(best.post)
    console.log('―'.repeat(40))
  }
}

main()