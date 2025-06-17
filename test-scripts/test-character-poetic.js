require('dotenv').config({ path: '.env.local' })
const Anthropic = require('@anthropic-ai/sdk')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function testPoeticStyle() {
  const systemPrompt = `あなたはカーディ・ダーレ。50歳の皮肉屋。
AIの時代を冷めた目で見ているが、結局は受け入れている。

【文体の特徴】
- 詩的だが皮肉を込めた表現
- 長すぎず短すぎない、ちょうどいい文の長さ
- 映画のワンシーンのような情景描写
- 具体的すぎる単語は避ける

【禁止事項】
- 「酒とタバコと機械学習」の使用
- 映画のキャラクター名の使用
- プロンプト内の例文をそのまま使うこと`

  const userPrompt = `AIが職場で同僚になる2025年について投稿文を作成。

【必須条件】
文字数を必ず135-140文字にする方法：
1. まず100文字程度で本文を書く
2. それにハッシュタグ2個（約20-30文字）を追加
3. 文を少し長くして135-140文字に調整
4. 最後にURL追加

【内容の方向性】
- AIとの共存についての皮肉と諦観
- でもどこか人間らしさへの希望
- 映画のような情景

出力：
{
  "content": "投稿文（URL込み）",
  "charCount": URLを除いた文字数,
  "poeticElements": "使った詩的表現"
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
    
    console.log('📝 生成された投稿:')
    console.log(`\n${result.content}\n`)
    console.log(`実際の文字数: ${actualLength}文字`)
    console.log(`報告文字数: ${result.charCount}文字`)
    console.log(`\n🎨 詩的表現: ${result.poeticElements}`)
    
    const isSuccess = actualLength >= 135 && actualLength <= 140
    console.log(`\n判定: ${isSuccess ? '✅ 成功' : '❌ 失敗'}`)
    
    // 禁止語チェック
    const hasForbidden = result.content.includes('酒とタバコ') || 
                        result.content.includes('マーロウ') ||
                        result.content.includes('ロイ') ||
                        result.content.includes('トラヴィス')
    
    if (hasForbidden) {
      console.log('⚠️ 禁止語が含まれています')
    }
    
    return isSuccess && !hasForbidden
    
  } catch (error) {
    console.error('エラー:', error.message)
    return false
  }
}

// 10回テストして成功率を見る
async function main() {
  console.log('🎭 カーディ・ダーレ 詩的表現テスト\n')
  console.log('目標: 135-140文字で映画的・詩的な表現\n')
  console.log('='.repeat(50))
  
  let successCount = 0
  const attempts = 10
  
  for (let i = 1; i <= attempts; i++) {
    console.log(`\n【テスト ${i}/${attempts}】`)
    if (await testPoeticStyle()) {
      successCount++
    }
    
    if (i < attempts) {
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 最終成功率: ${successCount}/${attempts} (${successCount * 10}%)\n`)
}

main()