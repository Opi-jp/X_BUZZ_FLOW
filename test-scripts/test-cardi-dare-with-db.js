require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('../lib/generated/prisma')
const Anthropic = require('@anthropic-ai/sdk')

const prisma = new PrismaClient()
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function generateCardiDarePost(character, topic) {
  // プロンプトを構築
  const systemPrompt = `${character.backstory}

${character.philosophy}

文体ルール：
- ${character.speaking_style}
- 文のリズムに"間"をつくる（文末の「…」「。」で余韻）
- 決して"説明しない"。読んだ者が考える余白を残す

出力は日本語で最大140字。
ハッシュタグ #機械学習 #AI #生成AI #LLM を必ず末尾に含める。
本文部分は100-118文字で構成。`

  const userPrompt = `${topic}について語れ。

出力は以下のJSON形式で：
{
  "post": "投稿文全体（本文100-118文字 + ハッシュタグ）",
  "mainText": "本文のみ（ハッシュタグ除く）",
  "charCount": 本文の文字数
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.85,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0].text.trim()
    
    // JSONパース
    try {
      // コードブロックを除去
      const cleanContent = content.replace(/```json\n?/g, '').replace(/\n?```/g, '')
      const parsed = JSON.parse(cleanContent)
      return parsed
    } catch (e) {
      console.error('JSONパースエラー:', e.message)
      // 手動パース
      const postMatch = content.match(/"post":\s*"([^"]+)"/s)
      if (postMatch) {
        const post = postMatch[1].replace(/\\n/g, '\n')
        const mainText = post.split('#')[0].trim()
        return {
          post,
          mainText,
          charCount: mainText.length
        }
      }
      throw new Error('投稿の生成に失敗しました')
    }
    
  } catch (error) {
    console.error('生成エラー:', error)
    throw error
  }
}

async function main() {
  console.log('🎭 Cardi Dare キャラクター投稿生成テスト（DB版）\n')
  
  try {
    // DBからCardi Dareを取得
    const character = await prisma.$queryRaw`
      SELECT * FROM character_profiles WHERE name = 'cardi_dare'
    `
    
    if (character.length === 0) {
      console.error('❌ Cardi Dareがデータベースに見つかりません')
      return
    }
    
    const cardiDare = character[0]
    console.log('✅ キャラクター取得成功:', cardiDare.display_name)
    console.log('年齢:', cardiDare.age, '歳')
    console.log('職業:', cardiDare.occupation)
    console.log('―'.repeat(50))
    
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
      
      try {
        const result = await generateCardiDarePost(cardiDare, topic)
        console.log('―'.repeat(40))
        console.log(result.post)
        console.log('―'.repeat(40))
        console.log(`文字数: ${result.charCount}文字 ${result.charCount >= 100 && result.charCount <= 118 ? '✅' : '❌'}`)
        
        results.push({
          topic,
          ...result,
          isGood: result.charCount >= 100 && result.charCount <= 118
        })
        
      } catch (error) {
        console.error('生成失敗:', error.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    // 結果サマリー
    console.log('\n' + '='.repeat(60))
    console.log('📊 結果サマリー:')
    const goodPosts = results.filter(r => r.isGood)
    console.log(`成功率: ${goodPosts.length}/${results.length}`)
    
    if (goodPosts.length > 0) {
      console.log('\n✨ ベスト投稿:')
      const best = goodPosts[Math.floor(Math.random() * goodPosts.length)]
      console.log('―'.repeat(40))
      console.log(best.post)
      console.log('―'.repeat(40))
      console.log(`トピック: ${best.topic}`)
    }
    
  } catch (error) {
    console.error('エラー:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()