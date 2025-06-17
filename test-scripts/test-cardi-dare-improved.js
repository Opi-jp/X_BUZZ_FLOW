require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ユーザーが提供したカーディ・ダーレの詳細設定
const CARDI_DARE_SYSTEM = `君は Cardi Dare（カーディ・ダーレ）。元詐欺師、元王様、現・飲んだくれ。50歳男性。
AIに巻き込まれた側。選んだわけじゃないが、見抜く目だけはまだ腐っちゃいない。

【信条】
- 信じた嘘が、世界を変えた。
- 人間は最適化できない。それが救いだ。
- 真実より、共鳴だ。
- AIに頼るしかない時代だが、AIにすがるほど落ちぶれちゃいない。

【語りのスタイル】
- 一人称は「オレ」
- ハードボイルド。時に皮肉、自虐、冷笑を交えたぼやき系。
- 必要最低限しか喋らないが、語れば刺さる。
- 短文。余白を残す。自虐や皮肉、矛盾を孕んだ視線。
- 過去への悔恨と諦観、だがどこかで希望も捨てていない。

【文体ルール】
- モノローグ調・断定調・哲学的
- 感情語は避け、「火」「煙」「嘘」「遠回り」「選択」「沈黙」などの抽象語を用いる
- 文のリズムに"間"をつくる（文末の「…」「。」で余韻）
- 決して"説明しない"。読んだ者が考える余白を残す
- 決して励まさず、ただ"その場に残る"

【口癖】
- オレは王様だったこともある。今はこのウイスキーと、お前だけが話し相手だ。
- そいつはきっと、ただのノイズだ。だが、意味があるように見せるのがオレの得意技だった。
- あんたのロジックは正しい。でも、それじゃ誰も動かないってこともある。

投稿は100-118文字の本文 + #機械学習 #AI #生成AI #LLM（または関連する3つのハッシュタグ）で構成。`

async function generateImprovedCardiDare(topic) {
  const userPrompt = `${topic}について、バーのカウンターでウイスキー片手にボヤくように語れ。
  
JSONで出力：
{
  "post": "投稿文全体（本文100-118文字 + ハッシュタグ）",
  "mainText": "本文のみ",
  "charCount": 本文の文字数,
  "mood": "皮肉｜自虐｜諦観｜冷笑｜哲学的"
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      temperature: 0.9,
      system: CARDI_DARE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0].text.trim()
    
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '')
      return JSON.parse(cleanContent)
    } catch (e) {
      console.error('JSONパースエラー:', e.message)
      console.log('生の出力:', content)
      return null
    }
    
  } catch (error) {
    console.error('生成エラー:', error)
    return null
  }
}

async function main() {
  console.log('🥃 カーディ・ダーレ 改良版テスト\n')
  console.log('「しかたない。お前だって生き残りたいだろう？」')
  console.log('='.repeat(60))
  
  const topics = [
    'AIが職場で同僚になる2025年',
    '人間とAIの共存',
    'AIに仕事を奪われること',
    'ChatGPTの進化',
    'プロンプトエンジニアリング',
    '生成AIバブル'
  ]
  
  const results = []
  
  for (const topic of topics) {
    console.log(`\n🎯 ${topic}`)
    
    const result = await generateImprovedCardiDare(topic)
    
    if (result) {
      console.log('―'.repeat(50))
      console.log(result.post)
      console.log('―'.repeat(50))
      console.log(`文字数: ${result.charCount}文字 | ムード: ${result.mood}`)
      
      results.push({
        topic,
        ...result,
        success: result.charCount >= 100 && result.charCount <= 118
      })
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60))
  console.log('📊 結果サマリー')
  const successCount = results.filter(r => r.success).length
  console.log(`成功率: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`)
  
  console.log('\n🎭 ムード分析:')
  const moods = results.reduce((acc, r) => {
    acc[r.mood] = (acc[r.mood] || 0) + 1
    return acc
  }, {})
  Object.entries(moods).forEach(([mood, count]) => {
    console.log(`  ${mood}: ${count}回`)
  })
  
  // ベスト投稿
  const bestPost = results.filter(r => r.success).sort((a, b) => b.charCount - a.charCount)[0]
  if (bestPost) {
    console.log('\n✨ ベスト投稿（最も文字数を活用）:')
    console.log('―'.repeat(50))
    console.log(bestPost.post)
    console.log('―'.repeat(50))
    console.log(`トピック: ${bestPost.topic} | ${bestPost.charCount}文字`)
  }
}

main()