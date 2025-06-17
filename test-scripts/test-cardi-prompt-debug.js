require('dotenv').config()
const { generateCharacterContent } = require('../lib/character-content-generator')
const { DEFAULT_CHARACTERS } = require('../types/character')

async function testCardiPrompt() {
  const cardi = DEFAULT_CHARACTERS.find(c => c.id === 'cardi-dare')
  
  if (!cardi) {
    console.error('カーディ・ダーレが見つかりません')
    return
  }

  // テスト用のコンセプト
  const testConcepts = [
    {
      conceptId: 'test1',
      topicTitle: 'AIが変える未来の働き方',
      hook: 'AIが仕事の8割を代替する時代、人間に残される役割とは？',
      angle: '雇用の未来に対する哲学的考察',
      structure: {
        openingHook: 'AIが仕事の8割を代替するって聞いて、どう思う？',
        background: '専門家は2030年までに多くの職種が消えると予測',
        mainContent: 'でも人間にしかできない創造性や共感力がある',
        reflection: '変化を恐れるより、適応することが大切',
        cta: '君はどう準備している？'
      }
    },
    {
      conceptId: 'test2',
      topicTitle: 'リモートワークがもたらす新しい生活',
      hook: '通勤時間ゼロの世界で見えてきた本当の豊かさ',
      angle: '働き方改革の本質的な価値',
      structure: {
        openingHook: '毎日の通勤がなくなって気づいたことがある',
        background: 'パンデミックが加速させたリモートワーク革命',
        mainContent: '時間の使い方が変わり、人生の優先順位も変わった',
        reflection: '本当の豊かさとは何か、考え直す時期',
        cta: 'あなたの生活はどう変わった？'
      }
    }
  ]

  console.log('=== カーディ・ダーレのプロンプトテスト ===\n')
  
  const previousContents = []
  
  for (let i = 0; i < testConcepts.length; i++) {
    const concept = testConcepts[i]
    
    console.log(`\n--- コンセプト${i + 1} ---`)
    console.log('トピック:', concept.topicTitle)
    console.log('フック:', concept.hook)
    console.log('既使用フレーズ数:', previousContents.length)
    
    try {
      // デバッグ用に一時的にプロンプトを表示
      const systemPrompt = `キャラクター設定は省略...`
      const userPromptDebug = `
【最重要】前段のコンセプト構造を厳密に維持せよ：
1. フック: 「${concept.structure.openingHook}」
2. 角度: 「${concept.angle}」

${previousContents.length > 0 ? `
【既に使用した表現（これらは使うな）】
冒頭: ${previousContents.map(p => `「${p.opening}」`).join(', ')}
締め: ${previousContents.map(p => `「${p.closing}」`).join(', ')}
` : '（初回なので制限なし）'}
`
      
      console.log('\nプロンプトの重複回避部分:')
      console.log(userPromptDebug)
      
      // 実際に生成
      const result = await generateCharacterContent({
        character: cardi,
        concept,
        voiceMode: 'normal',
        previousContents
      })
      
      console.log('\n生成結果:')
      console.log('冒頭20文字:', result.content.substring(0, 20))
      console.log('全文:', result.content)
      
      // previousContentsに追加
      if (result.content) {
        const contentLines = result.content.split('\n').filter(line => line.trim())
        if (contentLines.length > 0) {
          const opening = contentLines[0].substring(0, 20)
          const closing = contentLines[contentLines.length - 1].substring(0, 20)
          previousContents.push({ opening, closing })
          
          console.log('\n追跡に追加:')
          console.log('冒頭:', opening)
          console.log('締め:', closing)
        }
      }
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error('エラー:', error.message)
    }
  }
  
  console.log('\n\n=== 重複チェック ===')
  console.log('生成数:', previousContents.length)
  console.log('冒頭のユニーク数:', new Set(previousContents.map(p => p.opening)).size)
  console.log('締めのユニーク数:', new Set(previousContents.map(p => p.closing)).size)
}

testCardiPrompt()