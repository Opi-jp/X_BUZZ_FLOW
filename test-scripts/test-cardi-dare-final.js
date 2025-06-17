require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function generateCardiDarePost(topic) {
  const prompt = `君は Cardi Dare（カーディ・ダーレ）として以下を書け。

テーマ：${topic}

ルール：
- 本文を100-118文字で書く（3-4文で構成）
- 「火」「煙」「嘘」「遠回り」「選択」「沈黙」などの抽象語を使う
- 文末に「…」「。」で余韻
- 説明せず、詩的に
- 最後に必ず #機械学習 #AI #生成AI #LLM

出力は投稿文のみ。説明不要。`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      temperature: 0.85,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    return response.content[0].text.trim()
    
  } catch (error) {
    console.error('エラー:', error.message)
    return null
  }
}

// テスト実行
async function main() {
  console.log('🎭 カーディ・ダーレ（最終版）テスト\n')
  console.log('提供されたプロンプトによる詩的ハードボイルドスタイル')
  console.log('='.repeat(60))
  
  const topics = [
    'AIが職場で同僚になる2025年',
    '人間とAIの共存',
    'AIに仕事を奪われること',
    'AIと共に働く未来',
    '機械学習の進化'
  ]
  
  // 5つ生成して、良いものを選ぶ
  const results = []
  
  for (const topic of topics) {
    console.log(`\n📌 ${topic}`)
    
    const post = await generateCardiDarePost(topic)
    if (post) {
      console.log('―'.repeat(40))
      console.log(post)
      
      const mainText = post.split('#')[0].trim()
      console.log(`本文: ${mainText.length}文字`)
      
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